# 00 - Context

Contesto canonico per agent. Il codice reale resta la fonte primaria: leggere questi file solo per orientarsi, poi verificare sempre i file sorgente prima di modificare.

## Stato reale

- App privata locale per gestire progetti, prompt, variabili, immagini e note operative.
- Stack: React, TypeScript, Vite, CSS custom, `lucide-react`.
- Backend custom assente. Supabase e collegato per PIN app e sezioni Progetti/Prompt tramite client frontend anon.
- Deploy produzione attuale: Render `Static Site` collegato al repository GitHub `dero975/App-Control`; Supabase resta il backend dati.
- Workflow esterno presente: GitHub Actions `Supabase Keepalive` schedulato, separato dal runtime app.
- Agent esterni (Claude Code) accedono ai dati progetto via Supabase REST con header `x-app-control-project-id` e `x-app-control-agent-key`. RLS valida la chiave per progetto. Accesso scoped al singolo progetto: lettura dei dati e scrittura su `project_env_variables`. Documentato in `DNA/05_AGENT_API.md` e `DNA/06_APP_CONTROL_SYNC.md`.
- Workflow esterno presente anche per backup leggibile: Google Sheets popolato da Apps Script leggendo Supabase in sola lettura.
- Accesso app con PIN a 6 cifre sincronizzato su Supabase; sessione sbloccata in `sessionStorage` fino a chiusura/esci.
- Le sezioni Progetti e Prompt leggono/scrivono dati reali su Supabase dopo sblocco PIN app.
- Tipi dominio in `src/types/app.ts`.
- Entry point runtime: `src/main.tsx` -> `src/App.tsx` -> `src/app/AppLayout.tsx`.
- `App.tsx` carica le sezioni applicative in lazy loading, cosi il bundle iniziale resta piu leggero su device poco potenti.
- Unico ambiente applicativo `Admin`, senza selettore ambiente: `Progetti`, `Prompt`, `Impostazioni`, `Dashboard`.
- La sezione `Progetti` contiene anche dati foglio, variabili, immagini, note e sync agent.
- Il tab `Dati progetto` include il campo `CLIENTE`, salvato come campo dati del progetto: sostituisce il vecchio workspace Clienti separato, rimosso da codice e database.

## Mappa tecnica

- `src/app`: shell, sidebar desktop, navigazione mobile.
- `src/components`: componenti condivisi (`CopyButton`, `FieldGroup`, `SectionHeader`, `EmptyState`).
- `src/features/projects`: gestione principale dei progetti, tab interni, editor variabili condiviso, pannello immagini caricato solo quando serve e repository Supabase modulare.
- `src/features/prompts`: libreria prompt con filtri categoria, CRUD reale Supabase, copia, modale creazione e componenti separati per card/controller.
- `src/features/dashboard`: riepilogo email/piattaforme con modello, toolbar, summary e tabella separati.
- `src/features/settings`: gestione PIN app e sicurezza locale.
- `src/lib/clipboard.ts`: helper condiviso per copia clipboard.
- `src/lib/supabase.ts`: client Supabase frontend con sole variabili `VITE_SUPABASE_*` e helper obbligatorio `requireSupabaseClient()`.
- `src/lib/pinAccess.ts`: verifica e modifica PIN app via Supabase.
- `src/features/projects/projectRepository.ts`: facade pubblico dell'accesso dati Supabase per Progetti; letture, scritture e tipi sono separati in moduli dedicati nella stessa cartella.
- `src/lib/repositoryUtils.ts`: helper puri condivisi dai repository per chiavi campo e validazione duplicati.
- `src/styles/app.css`: entry CSS che importa sezioni tematiche da `src/styles/sections/`; `src/index.css` resta lo stile base globale.

## Regole non negoziabili

- Non reintrodurre login email/password o Auth UI senza richiesta esplicita.
- L'accesso agent e scoped al singolo progetto: lettura dei dati + scrittura su `project_env_variables` (migration `20260618_01`). Non estendere la scrittura agent ad altre tabelle senza richiesta esplicita.
- Non ampliare Supabase, SQL o storage senza richiesta esplicita.
- `SUPABASE_SERVICE_ROLE_KEY`, `RENDER_API_KEY`, DB URL e token GitHub devono restare solo in `.env` locale o sistemi sicuri: mai frontend, log, markdown o chat.
- Non hardcodare segreti reali in mock, codice o documentazione.
- Non creare dashboard: la UI resta sezione -> lista/indice -> dettaglio -> tab/sottosezioni.
- Non separare `Dati progetto`, `Variabili`, `Immagini` o `Sync` come voci sidebar: restano tab dentro `Progetti`.
- Non duplicare documentazione con lo stesso scopo.
- Aggiornare `DNA/` solo quando cambia una logica, un vincolo, un flusso o un workflow reale.
- Se `DNA/` e codice divergono, vale il codice e `DNA/` va riallineato.

## Documentazione canonica

- `README_OPERATIVO.md`: ingresso obbligatorio per agent.
- `DNA/00_CONTEXT.md`: stato, architettura e guardrail.
- `DNA/01_FLOWS.md`: flussi UI e logiche critiche attuali.
- `DNA/02_DATA_INTEGRATIONS.md`: modello dati reale, mock, integrazioni future.
- `DNA/03_OPERATIONS.md`: script, validazione e workflow operativo.
- `DNA/04_SUPABASE_SCHEMA_SQL.md`: schema Supabase target e script SQL ordinati.
- `DNA/05_AGENT_API.md`: API per agent esterni con autenticazione agent key.
- `DNA/06_APP_CONTROL_SYNC.md`: sincronizzazione agent <-> App Control, layout variabili e scrittura sicura.
