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

**Inserisce l'UTENTE (una volta, alla creazione), 5 valori:**
`SUPABASE_URL`, `SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `DATABASE_URL` (escono insieme creando il progetto Supabase a mano), `RENDER_API_KEY` (dal nuovo account Render).

**Gestisce l'AGENT:**
`GITHUB_URL` (crea lui il repo con `gh repo create`), `GITHUB_TOKEN` (consigliato un token messo in App Control: vale su tutti i dispositivi, evita `gh auth login` ad ogni device), `LINK_DEPLOY` e `LINK_DEPLOY ADMIN` (dopo il deploy), piu **tutte** le variabili/segreti generati durante lo sviluppo (`SESSION_SECRET`, chiavi di altre piattaforme, ecc.).

App Control va usata come **libretto privato** di tutti i segreti del progetto: oltre alle canoniche, accetta variabili extra.

## Layout sezione Variabili (implementato)

- Le **5 dell'utente** in un box verde "**Da inserire manualmente**": `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `DATABASE_URL`, `RENDER_API_KEY`.
- Quelle dell'agent in una lista "**Gestite da Agent**": `GITHUB_URL`, `GITHUB_TOKEN` + eventuali variabili extra/segreti.
- La classificazione e in `VariablesPanel` (`userVariableKeys` vs `managedVariables`); il flag `singleEnvCopy` arriva da `isVariablesPanel`.
- Ogni riga: nome + valore sulla **stessa riga**, niente box per singola variabile, divisorio sottile. Un **solo tasto copia** che copia `NOME=valore` (formato .env), allineato con matita e cestino.
- `LINK_DEPLOY` / `LINK_DEPLOY ADMIN` non si mostrano nella lista (il valore resta salvato e il link sotto al titolo continua a funzionare).
- Pulsante `.env` (copia tutte le variabili con derivate `VITE_*`). Rimosso "Aggiorna da .env".
- `VITE_SUPABASE_URL` / `VITE_SUPABASE_ANON_KEY`: NON si archiviano, sono copie con prefisso generate solo quando serve (frontend Vite).

## Formato nomi variabili (regola)

I titoli archiviati sono i **nomi canonici di sorgente** e vanno tenuti cosi (non rinominare): `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `DATABASE_URL`, `RENDER_API_KEY`, `GITHUB_URL`, `GITHUB_TOKEN`. Rinominarli romperebbe sia la lettura interna (`mapProjectRow` cerca le chiavi esatte) sia la generazione automatica delle derivate.

Il formato "giusto per il provider" lo produce l'export `.env`: per frontend Vite genera `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY` e `SUPABASE_DB_URL` con lo stesso valore. Le variabili che l'agent crea devono seguire questa stessa regola: nome canonico in App Control, prefisso `VITE_` aggiunto solo nel `.env` quando il progetto e Vite.

## Scrittura sicura (da attivare)

Oggi il canale agent e **solo lettura**. Per far scrivere l'agent senza usare la service_role ("tasto master"), c'e la migration additiva e reversibile:
`supabase/migrations/20260618_01_agent_env_write_access.sql` (policy INSERT/UPDATE/DELETE su `project_env_variables` limitate al solo progetto della chiave agent).

Stato: **scritta, NON ancora applicata** al DB di produzione. Fermarsi sempre prima di applicare migration/modifiche al DB di App Control: l'owner decide quando.

## Prove ed eccezioni

- Lettura+scrittura verificate col service_role (canale "tasto master") su App Control; l'owner non vuole quel metodo come standard.
- I test del nuovo flusso si fanno su un progetto usa-e-getta (es. "PROGETTO TEST"), mai su App Control reale.
