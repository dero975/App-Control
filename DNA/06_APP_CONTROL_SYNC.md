# 06 - App Control Sync (lavoro in corso)

Documento dedicato al lavoro di sincronizzazione agent <-> App Control: come un agent (Claude Code) preleva e mantiene allineate le variabili di un progetto in App Control. Va tenuto aggiornato man mano che il lavoro avanza.

## Idea di fondo

App Control e la "cassaforte" centrale (suo Supabase) con le variabili di tutti i progetti. Da un qualsiasi progetto aperto, l'agent si collega **da remoto** ad App Control, **legge** le variabili del progetto e ne **genera il `.env`**; quando ne nascono di nuove durante lo sviluppo, le **riscrive** in App Control. L'utente non scrive mai a mano nel `.env`.

## Connessione: il file `.agent/app-control.json`

Sta nella **root del progetto** (in `.gitignore`), non in App Control. Contiene le 4 chiavi del tab **Sync**:

```json
{
  "projectId": "...",
  "agentKey": "...",
  "appControlSupabaseUrl": "https://xxx.supabase.co",
  "appControlSupabaseAnonKey": "eyJ..."
}
```

L'agent lo legge da solo a inizio sessione e si collega ad App Control con header `x-app-control-project-id` + `x-app-control-agent-key` + anon key. La sezione Sync (e la chiave agent) si **genera in automatico** alla creazione di un nuovo progetto (`createEmptyProject` -> `createProjectRecord`). Nota: il progetto App Control stesso ha `agentKey` vuoto perche precede questa funzione.

## Chi inserisce quali variabili

L'utente crea un account/email nuovo per progetto (limiti free tier) -> GitHub, Supabase, Render sono nuovi ogni volta.

**Inserisce l'UTENTE (una volta, alla creazione), 7 valori:**
`SUPABASE_URL`, `SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `DATABASE_URL` (escono insieme creando il progetto Supabase a mano), `RENDER_API_KEY` (dal nuovo account Render), `GITHUB_URL` (l'URL del repo, se gia esistente) e `GITHUB_TOKEN` (scelta dell'owner: inserirlo a mano e piu semplice/robusto — l'agent lo trova pronto, niente `gh auth login` ne `gh repo create`).

**Gestisce l'AGENT:**
`LINK_DEPLOY` e `LINK_DEPLOY ADMIN` (dopo il deploy), piu **tutte** le variabili/segreti generati durante lo sviluppo (`SESSION_SECRET`, chiavi di altre piattaforme, ecc.). Se `GITHUB_URL` non e stato messo a mano (repo non ancora creato), lo crea lui con `gh repo create` e lo scrive.

App Control va usata come **libretto privato** di tutti i segreti del progetto: oltre alle canoniche, accetta variabili extra.

## Layout sezione Variabili (implementato)

- Le **7 dell'utente** in un box verde "**Da inserire manualmente**": `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `DATABASE_URL`, `RENDER_API_KEY`, `GITHUB_URL`, `GITHUB_TOKEN`.
- Quelle dell'agent in una lista "**Gestite da Agent**": variabili extra/segreti generati durante lo sviluppo.
- La classificazione e in `VariablesPanel` (`userVariableKeys` vs `managedVariables`); il flag `singleEnvCopy` arriva da `isVariablesPanel`.
- Ogni riga: nome + valore sulla **stessa riga**, niente box per singola variabile, divisorio sottile. Un **solo tasto copia** che copia `NOME=valore` (formato .env), allineato con matita e cestino.
- `LINK_DEPLOY` / `LINK_DEPLOY ADMIN` non si mostrano nella lista (il valore resta salvato e il link sotto al titolo continua a funzionare).
- Pulsante `.env` (copia tutte le variabili con derivate `VITE_*`). Rimosso "Aggiorna da .env".
- `VITE_SUPABASE_URL` / `VITE_SUPABASE_ANON_KEY`: NON si archiviano, sono copie con prefisso generate solo quando serve (frontend Vite).

## Formato nomi variabili (regola)

I titoli archiviati sono i **nomi canonici di sorgente** e vanno tenuti cosi (non rinominare): `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `DATABASE_URL`, `RENDER_API_KEY`, `GITHUB_URL`, `GITHUB_TOKEN`. Rinominarli romperebbe sia la lettura interna (`mapProjectRow` cerca le chiavi esatte) sia la generazione automatica delle derivate.

Il formato "giusto per il provider" lo produce l'export `.env`: per frontend Vite genera `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY` e `SUPABASE_DB_URL` con lo stesso valore. Le variabili che l'agent crea devono seguire questa stessa regola: nome canonico in App Control, prefisso `VITE_` aggiunto solo nel `.env` quando il progetto e Vite.

## Scrittura sicura (ATTIVA)

Il canale agent supporta ora **lettura e scrittura**, senza usare la service_role ("tasto master"). Migration additiva e reversibile:
`supabase/migrations/20260618_01_agent_env_write_access.sql` — policy INSERT/UPDATE/DELETE su `project_env_variables` limitate al solo progetto della chiave agent (riusa `app_control_request_is_agent_authorized_for_project`).

Stato: applicata al DB di produzione il 18 Giugno 2026. **ATTENZIONE — quella verifica del 18/06 NON rispecchiava il dato reale del Sync**: i test furono fatti passando come `x-app-control-project-id` l'`id` UUID interno (che soddisfaceva le policy 20260617/20260618, basate su `id::text`), non lo **slug** (`agent_project_id`) che il tab Sync distribuisce davvero. Col valore reale (slug) il canale rispondeva sempre `[]`. Il bug e la diagnosi completa sono in `DIAGNOSI-APP-CONTROL.md`.

**Fix applicata il 19 Giugno 2026** — migration `supabase/migrations/20260619_01_agent_key_fix_slug_match.sql`: le policy del canale agent ora identificano il progetto con **slug (`agent_project_id`) + agent key** insieme (helper `app_control_request_authorized_project_uuid()` che traduce verso `projects.id`). Verificata end-to-end sul canale agent reale (anon + header con lo **slug** `nuovo-progetto-18`, niente service_role):
READ 200 (9 righe), INSERT 201, DELETE 204; lettura/scrittura con agent key errata **bloccata** (`[]`) = isolamento per progetto confermato.

Nota: lo slug da solo non e univoco (unique su `(user_id, agent_project_id)`, `user_id` nullable) — per questo il match usa slug + agent key insieme.

Per qualsiasi futura modifica al DB di App Control: fermarsi sempre e farsi dare il "vai" dall'owner.

## Prove ed eccezioni

- Lettura+scrittura verificate col service_role (canale "tasto master") su App Control; l'owner non vuole quel metodo come standard.
- I test del nuovo flusso si fanno su un progetto usa-e-getta (es. "PROGETTO TEST"), mai su App Control reale.
