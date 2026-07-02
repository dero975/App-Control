# 06 - App Control Sync (lavoro in corso)

Documento dedicato al lavoro di sincronizzazione agent <-> App Control: come un agent (Claude Code) preleva e mantiene allineate le variabili di un progetto in App Control. Va tenuto aggiornato man mano che il lavoro avanza.

## Idea di fondo

App Control e la "cassaforte" centrale (suo Supabase) con le variabili di tutti i progetti. Da un qualsiasi progetto aperto, l'agent si collega **da remoto** ad App Control, **legge** le variabili del progetto e ne **genera il `.env`**; quando ne nascono di nuove durante lo sviluppo, le **riscrive** in App Control. L'utente non scrive mai a mano nel `.env`.

## Come l'agent "attinge" alle regole — e perche non spreca (enterprise)

Le regole vivono in App Control (tabella `prompts`, prompt `CLAUDE.MD`). Il canale agent le legge via REST (policy `prompts_agent_select`, migration `20260619_02`): leggibile da qualunque agent autorizzato per un progetto valido. Ma il meccanismo che le rende **realmente eseguite senza loop ne spreco** e questo:

- **CLAUDE.md vive come file su disco**, non come lettura ripetuta dal DB. Lo step (2) del Sync scarica `prompts.full_text` (titolo esatto `CLAUDE.MD`) e lo scrive come `CLAUDE.md` nella root. Da li **Claude Code lo carica automaticamente a ogni sessione** (file nativo, vincolante, costo zero). Il file e la **cache**: si ri-scarica solo se **manca o e diverso** da App Control (idempotente). Mai rileggere il DB a ogni messaggio.
- **Esecuzione con gate temporali (no azioni infinite).** Il protocollo §0 del `CLAUDE.MD` e deterministico: i 5 controlli d'avvio girano **una volta a inizio sessione**, ogni passo con una **condizione** (se gia a posto, salta). Completati, il protocollo e **chiuso**: non si rilancia a ogni turno.
- **Riconciliazione solo dopo eventi reali (§1bis del CLAUDE.MD).** Variabili e due link si ri-sincronizzano **solo** dopo un evento concreto (nuova variabile/segreto, deploy/URL cambiato, richiesta esplicita). Senza eventi: nessuna lettura/scrittura. Questo e cio che evita lo spreco di crediti.

Regola d'oro: **rigido nell'eseguire, ozioso quando non serve.** Se non c'e niente di nuovo, l'agent non fa nulla e lo dice in una riga.

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

### Fonte unica del prompt di Sync (vincolante)
Il testo del prompt di Sync e definito da **`defaultSyncPrompt`** in `projectPageConstants.ts` (mostrato nel tab Sync e copiato dall'utente). E la **fonte canonica** e deve essere autosufficiente: include scaricare `CLAUDE.MD`, generare `.env` (colonna `value_text`, mai `value`), `.mcp.json`, git remote col token, e **riscrivere nuove variabili SOLO in `project_env_variables`** (unica tabella scrivibile dal canale agent). `resolveSyncPrompt` rimpiazza automaticamente **tutte** le versioni legacy registrate in `legacySyncPrompts` (`projectPageModel.ts`) con quella corrente, cosi anche i progetti esistenti mostrano il prompt aggiornato senza toccare il DB. **Regola di manutenzione:** ogni volta che cambi `defaultSyncPrompt`, sposta il valore precedente in una costante legacy e aggiungila a `legacySyncPrompts`, altrimenti i progetti che lo avevano adottato non si auto-aggiornano. Il prompt **BOOTSTRAP** e il prompt **CLAUDE.MD** (tabella `prompts`) sono allineati a questa stessa logica: non devono divergere.

## Chi inserisce quali variabili

L'utente crea un account/email nuovo per progetto (limiti free tier) -> GitHub, Supabase, Render sono nuovi ogni volta.

**Inserisce l'UTENTE (una volta, alla creazione), 9 valori:**
`SUPABASE_URL`, `SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `DATABASE_URL` (escono insieme creando il progetto Supabase a mano), `RENDER_API_KEY` (dal nuovo account Render), `GITHUB_URL` (l'URL del repo, se gia esistente), `GITHUB_TOKEN` (scelta dell'owner: inserirlo a mano e piu semplice/robusto — l'agent lo trova pronto, niente `gh auth login` ne `gh repo create`), e i **due link di deploy** `LINK_DEPLOY` (URL pubblico/user) e `LINK_DEPLOY ADMIN` (URL area admin/gestione del progetto), inseriti a mano nel box "Da inserire manualmente" e mostrati come link sotto al titolo.

**Gestisce l'AGENT:**
I due link di deploy `LINK_DEPLOY` e `LINK_DEPLOY ADMIN` **non li gestisce piu l'Agent**: sono manuali dell'utente (vedi sopra). L'Agent li **legge** soltanto (per popolare il `.env` se servono) ma **non li scrive ne li sovrascrive** in `project_env_variables`; se sono vuoti e conosce i link reali dal deploy, li segnala all'utente perche li inserisca a mano, senza scriverli. L'Agent gestisce invece **tutte** le altre variabili/segreti generati durante lo sviluppo (`SESSION_SECRET`, chiavi di altre piattaforme, ecc.). **Riconciliazione a ogni sync (regola rigida):** l'Agent confronta le chiavi del `.env` reale con quelle gia in `project_env_variables` e **carica ogni variabile/segreto nuovo o cambiato**. Non sempre ci sono variabili nuove: se il delta e vuoto non scrive nulla, ma la verifica va fatta **ogni volta**. **Esclude dall'upload** solo: le 9 variabili manuali dell'utente (incluse `LINK_DEPLOY` e `LINK_DEPLOY ADMIN`) e le derivate `VITE_*`/`SUPABASE_DB_URL` (si rigenerano dal `.env`, non si archiviano). Le variabili caricate appaiono nella UI sotto "**Gestite da Agent**" (classificazione `managedVariables` in `VariablesPanel`). Se `GITHUB_URL` non e stato messo a mano (repo non ancora creato), lo crea lui con `gh repo create` e lo scrive.

App Control va usata come **libretto privato** di tutti i segreti del progetto: oltre alle canoniche, accetta variabili extra.

## Layout sezione Variabili (implementato)

- Le **9 dell'utente** in un box verde "**Da inserire manualmente**", i due link in cima: `LINK_DEPLOY`, `LINK_DEPLOY ADMIN`, `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `DATABASE_URL`, `RENDER_API_KEY`, `GITHUB_URL`, `GITHUB_TOKEN`.
- Quelle dell'agent in una lista "**Gestite da Agent**": variabili extra/segreti generati durante lo sviluppo.
- La classificazione e in `VariablesPanel` (`userVariableKeys` vs `managedVariables`); il flag `singleEnvCopy` arriva da `isVariablesPanel`.
- Ogni riga: nome + valore sulla **stessa riga**, niente box per singola variabile, divisorio sottile. Un **solo tasto copia** che copia `NOME=valore` (formato .env), allineato con matita e cestino.
- `LINK_DEPLOY` / `LINK_DEPLOY ADMIN` si mostrano in cima al box "Da inserire manualmente" (inserimento manuale) e come link cliccabili sotto al titolo del progetto. Round-trip salva/ricarica: `LINK_DEPLOY` passa da `projects.deploy_url`, `LINK_DEPLOY ADMIN` da `project_env_variables` (entrambi non sensibili, `value_text`).
- Pulsante `.env` (copia tutte le variabili con derivate `VITE_*`). Rimosso "Aggiorna da .env".
- `VITE_SUPABASE_URL` / `VITE_SUPABASE_ANON_KEY`: NON si archiviano, sono copie con prefisso generate solo quando serve (frontend Vite).

## Formato nomi variabili (regola)

I titoli archiviati sono i **nomi canonici di sorgente** e vanno tenuti cosi (non rinominare): `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `DATABASE_URL`, `RENDER_API_KEY`, `GITHUB_URL`, `GITHUB_TOKEN`. Rinominarli romperebbe sia la lettura interna (`mapProjectRow` cerca le chiavi esatte) sia la generazione automatica delle derivate.

Il formato "giusto per il provider" lo produce l'export `.env`: per frontend Vite genera `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY` e `SUPABASE_DB_URL` con lo stesso valore. Le variabili che l'agent crea devono seguire questa stessa regola: nome canonico in App Control, prefisso `VITE_` aggiunto solo nel `.env` quando il progetto e Vite.

## Colonne valore: `value_text` vs `value_ciphertext` (regola critica)

Ogni riga di `project_env_variables` ha DUE colonne valore e un flag `is_sensitive`:
- **NON sensibili** (`is_sensitive=false`): valore in **`value_text`** (es. `GITHUB_URL`, `SUPABASE_URL`, `LINK_DEPLOY`).
- **Sensibili** (`is_sensitive=true`): valore in **`value_ciphertext`** (es. `GITHUB_TOKEN`, `SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `DATABASE_URL`, `RENDER_API_KEY`, `SESSION_SECRET`).
- La colonna `value` non esiste / non si usa mai.

**In LETTURA** (rigenerare `.env`): per ogni variabile prendi il campo giusto in base a `is_sensitive`. Leggere solo `value_text` lascia VUOTE tutte le sensibili → `.env` con token/chiavi/DATABASE_URL vuoti (bug reale osservato). Mai scrivere valori vuoti nel `.env`.

**In SCRITTURA** (INSERT dal canale agent): includi sempre `project_id` = **UUID** del progetto (ottenuto dalla SELECT su `projects`, NON lo slug dell'header — la policy RLS confronta l'UUID, lo slug da 401). Metti il valore in `value_ciphertext` con `is_sensitive=true` se e un segreto, altrimenti in `value_text` con `is_sensitive=false`.

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
