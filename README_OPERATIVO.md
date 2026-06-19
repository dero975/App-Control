# App Control - README Operativo

Punto di ingresso obbligatorio per ogni agent che lavora su questo progetto.

## Ordine di lavoro

1. Leggere questo file.
2. Leggere solo i file `DNA/` pertinenti al task.
3. Verificare sempre il codice reale prima di modificare.
4. Trattare `DNA/` come contesto operativo canonico, non come sostituto del codice.
5. Aggiornare `DNA/` solo quando cambia una logica critica, un vincolo, un flusso, un'integrazione o un workflow reale.

## Stato sintetico

App Control e una web app privata locale in React, TypeScript e Vite. L'accesso app usa PIN a 6 cifre sincronizzato su Supabase; dopo sblocco resta attivo in `sessionStorage` fino a chiusura/esci. Il primo accesso propone `Ricorda questo dispositivo` gia attivo: il browser salva solo un token casuale locale e Supabase conserva solo l'hash, cosi alle aperture successive l'app verifica il dispositivo attendibile prima di mostrare il PIN. Il client invia header tecnici autorizzativi usati dalle policy Supabase hardenizzate. Le sezioni Progetti, Prompt e Dashboard usano dati reali coerenti con il database Supabase senza login email/password. Non esistono storage immagini o backend custom. E presente una GitHub Action separata per keepalive Supabase. E attivo anche un backup Google Sheets esterno letto da Supabase tramite Apps Script.

L'app ha un unico ambiente `Admin`, senza selettore ambiente: la sezione principale resta `Progetti`. Dentro `Progetti` sono consolidati anche dati foglio, variabili, immagini e note. Le altre sezioni attive in navigazione sono `Prompt`, `Dashboard` e `Impostazioni`.

Il tab `Dati progetto` di ogni progetto include ora il campo `CLIENTE`, salvato come campo dati del progetto: sostituisce il vecchio workspace Clienti separato, che e stato completamente rimosso dal codice e dal database.

## Stato connessioni verificato (19 Giugno 2026)

Verifica operativa reale eseguita da agent (non dedotta dal codice). Distingue LETTURA e SCRITTURA con la prova.

- **Database (Supabase, host `aws-0-eu-west-1.pooler.supabase.com`)**:
  - LETTURA: verificata — `psql "$SUPABASE_DB_URL"` lista 9 tabelle public (`app_control_settings`, `app_control_trusted_devices`, `project_agent_keys`, `project_data_fields`, `project_env_variables`, `project_images`, `project_platform_accesses`, `projects`, `prompts`).
  - SCRITTURA: verificata transazionale-rollback — `begin; create temp table _probe; insert; rollback;` accettato ed eseguito, poi rollback; conteggio tabelle invariato (9→9, zero drift). Nessuna scrittura persistente.
- **GitHub (`dero975/App-Control`)**: connesso — `gh` autenticato (account attivo `dero975`, scope `repo`/`workflow`). Branch `main` allineato a `origin/main`.
- **CI (GitHub Actions)**: unico workflow operativo `Supabase Keepalive` (cron giornaliero) — ultime run `success`. Dependabot attivo (un update vite fallito `#1416239346`, uno success: vedi RISCHI).
- **Deploy (Render Static Site `srv-d80d0ebrjlhs73a7eua0`)**: `autoDeploy: yes` su branch `main`. Ultimo deploy `live` = commit `a711133` (= HEAD locale). Nessun deploy fallito recente. Sito `https://app-control-tz28.onrender.com` → HTTP 200. **Un push su `main` È un deploy in produzione.**
- **Render API**: raggiungibile read-only con `RENDER_API_KEY` (lista servizi 200).
- **Canale Agent (REST, header `x-app-control-project-id` + `x-app-control-agent-key`)**: ✅ **RIPARATO** (19 Giugno 2026, migration `20260619_01_agent_key_fix_slug_match.sql`). Verificato end-to-end con lo **slug** reale: READ 200 (9 righe), INSERT 201, DELETE 204, isolamento con chiave errata `[]`. Prima era rotto (RLS su `id` UUID invece che sullo slug). Storia in `DIAGNOSI-APP-CONTROL.md`.

### Tool e runtime richiesti
- `node` 22, `npm` 10 (lockfile = npm, non pnpm), `git`, `gh`, `psql` 18 — tutti presenti.
- Nessun runtime container necessario: il progetto non usa `testcontainers`, `docker-compose` né `Dockerfile`.
- `.env` locale presente con tutte le 10 variabili (`VITE_SUPABASE_*`, `SUPABASE_URL/ANON_KEY/SERVICE_ROLE_KEY/DB_URL`, `GITHUB_URL/TOKEN`, `RENDER_API_KEY`, `APP_CONTROL_BACKUP_TOKEN`) e correttamente in `.gitignore`. Nessun secret mancante da generare.

### Problemi noti
- ~~Canale agent inattivo (bug RLS)~~ → **RISOLTO il 19 Giugno 2026** con `20260619_01_agent_key_fix_slug_match.sql`. Le policy `20260617_01` / `20260618_01` confrontavano `id::text` con lo slug dell'header (sempre falso → `[]`); ora un helper risolve slug + agent key verso l'UUID. Storia completa in `DIAGNOSI-APP-CONTROL.md`. Nessun problema noto aperto sul canale agent.

## DNA canonico

- `DNA/00_CONTEXT.md`: stato reale, architettura e guardrail non negoziabili.
- `DNA/01_FLOWS.md`: flussi UI e logiche critiche attuali.
- `DNA/02_DATA_INTEGRATIONS.md`: dati reali, integrazioni attive/future e vincoli.
- `DNA/03_OPERATIONS.md`: script, validazione e workflow operativo.
- `DNA/04_SUPABASE_SCHEMA_SQL.md`: schema Supabase target e script SQL ordinati.
- `DNA/05_AGENT_API.md`: API per agent esterni (Claude Code) con autenticazione tramite agent key.
- `DNA/06_APP_CONTROL_SYNC.md`: lavoro di sincronizzazione agent <-> App Control (chi inserisce quali variabili, layout, scrittura sicura).

## Learning log

- `LEARNINGS.md`: osservazioni accumulate dagli agent su errori ricorrenti, fix non ovvi e vincoli di sistema. L'agent aggiunge voci solo quando rilevante. Non va mai modificato in autonomia.

## Regole operative

- Il codice reale e fonte primaria.
- Non creare documentazione parallela o doppia.
- Non introdurre backend, Supabase, SQL, auth o storage senza richiesta esplicita.
- Supabase e gia integrato per `Progetti`, `Prompt` e PIN app: non usare `SUPABASE_SERVICE_ROLE_KEY` nel frontend e non loggare mai segreti.
- Non ripristinare policy Supabase permissive `anon/auth using (true)` sulle tabelle operative. Le policy target devono passare da `public.app_control_request_is_authorized()` oppure da un modello Auth piu forte.
- Non inserire segreti reali in codice, mock o documentazione.
- In `Agent sync`, mantenere solo prompt generico stabile non modificabile e JSON di collegamento per progetto; non duplicare chiavi o credenziali in viste parallele. Le variabili canoniche archiviate in App Control sono `LINK_DEPLOY`, `GITHUB_URL`, `GITHUB_TOKEN`, `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `DATABASE_URL`, `RENDER_API_KEY`; `LINK_DEPLOY ADMIN`, eventuali `VITE_SUPABASE_*` e `SUPABASE_DB_URL` vanno derivate solo quando il codice o il provider le richiedono.
- Il backup Google Sheets usa solo due tab canonici: `Progetti` e `Prompt`. Serve come copia leggibile e ripristinabile, non come fonte primaria o canale di editing.
- RLS finale: le tabelle operative non hanno letture anonime libere. L'app passa da `public.app_control_request_is_authorized()` dopo PIN o dispositivo attendibile; il backup Google Sheets puo leggere solo con header dedicato `x-app-control-backup-token`.
- In `Immagini`, mantenere cinque slot fissi sempre disponibili; il database futuro deve persistere metadati e path Storage, non data URL come fonte canonica.
- Non creare dashboard o voci sidebar per `Dati progetto` e `Immagini`.
- Su mobile la shell mostra il logo centrato nella top bar superiore.
- La schermata PIN deve restare entro il viewport mobile anche su iPhone stretti: il pannello usa dimensioni responsive e non deve generare scroll orizzontale.
- La pagina PIN e percorso critico e non va resa lazy: il passaggio dallo splash al PIN deve avvenire senza secondo flash dello splash.
- Su mobile la lista progetto resta compatta, ma ogni card espansa puo aprire una scheda progetto fullscreen dedicata. La scheda mobile riusa i tab reali del dettaglio (`Dati progetto`, `Variabili`, `Immagini`, `Note`, `Sync`) con UX app-friendly; il pannello laterale dettaglio resta una logica desktop.
- La lista progetto mostra card separate direttamente sul fondo pagina, senza container/pannello esterno dell'elenco. Ogni card mostra nome progetto sempre in maiuscolo e `Ultima modifica`; la preview `sviluppo in / deploy con` non e piu mostrata nella card lista. La selezione usa sfondo bianco e accento verde scuro.
- La puntina sulle card progetto fissa il progetto in alto come preferenza locale browser tramite `localStorage`; non scrive su Supabase e non cambia il dato operativo del progetto.
- Nei tab `Dati progetto` e `Variabili`, i box consolidati si modificano solo dopo click sulla matita; i nuovi campi appena aggiunti restano liberi per il primo inserimento di titolo e valore, poi si consolidano quando si esce dal box compilato.
- La lista `Progetti` mantiene l'ordine corrente finche Admin non cambia ricerca o ordinamento: selezione/apertura card, cambio tab e pin locale non devono aggiornare `Ultima modifica`; solo modifiche reali ai contenuti del progetto attivano autosave e `updated_at`.
- L'autosave del dettaglio progetto non deve ricalcolare payload pesanti non collegati alla modifica corrente: le immagini sono tracciate con firma dedicata per evitare rallentamenti durante typing e navigazione.
- All'apertura della sezione `Progetti`, l'ordinamento predefinito e alfabetico A-Z; solo un'azione esplicita di Admin puo portarlo su altri ordinamenti.
- Nella libreria `Prompt`, aprire una card e sola lettura: per modificare titolo, sezione o testo bisogna cliccare la matita accanto al cestino.
- Non usare comandi distruttivi o Git push/commit senza richiesta esplicita.
- Agent esterni accedono ai dati progetto tramite Supabase REST con header `x-app-control-project-id` e `x-app-control-agent-key`. Accesso scoped al singolo progetto: lettura dei dati e scrittura su `project_env_variables`. Il file `.agent/app-control.json` contiene le credenziali di connessione e non va mai committato.
- Il file `.mcp.json` generato dal sync contiene token di progetto e non va mai committato.
- Dopo modifiche codice, verificare con gli script esistenti in `package.json`.
