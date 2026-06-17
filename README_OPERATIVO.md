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

L'app ora e divisa in due ambienti:

- `Admin`: mantiene la logica storica con `Progetti`, `Prompt`, `Impostazioni` e `Dashboard`.
- `Clienti`: archivio clienti separato con scheda cliente, progetti cliente e dati progetto cliente.

Anche il workspace `Clienti` usa ora Supabase come fonte canonica. Non mantenere o reintrodurre persistenza locale browser come fallback dati.

Nel workspace `Admin`, la sezione principale resta `Progetti`. Dentro `Progetti` sono consolidati anche dati foglio, variabili, immagini e note. Le altre sezioni attive in navigazione sono `Prompt`, `Dashboard` e `Impostazioni`.

## DNA canonico

- `DNA/00_CONTEXT.md`: stato reale, architettura e guardrail non negoziabili.
- `DNA/01_FLOWS.md`: flussi UI e logiche critiche attuali.
- `DNA/02_DATA_INTEGRATIONS.md`: dati reali, integrazioni attive/future e vincoli.
- `DNA/03_OPERATIONS.md`: script, validazione e workflow operativo.
- `DNA/04_SUPABASE_SCHEMA_SQL.md`: schema Supabase target e script SQL ordinati.
- `DNA/05_AGENT_API.md`: API per agent esterni (Claude Code) con autenticazione tramite agent key.

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
- Su mobile le liste progetto di `Admin` e `Clienti` restano compatte, ma ogni card espansa puo aprire una scheda progetto fullscreen dedicata. La scheda mobile riusa i tab reali del dettaglio (`Dati progetto`, `Variabili`, `Immagini`, `Note`, `Sync`) con UX app-friendly; il pannello laterale dettaglio resta una logica desktop.
- Le liste progetto di `Admin` e `Clienti` mostrano card separate direttamente sul fondo pagina, senza container/pannello esterno dell'elenco. Ogni card mostra nome progetto sempre in maiuscolo e `Ultima modifica`; la preview `sviluppo in / deploy con` non e piu mostrata nella card lista. La selezione usa sfondo bianco e accento verde scuro.
- La puntina sulle card progetto fissa il progetto in alto come preferenza locale browser tramite `localStorage`; non scrive su Supabase e non cambia il dato operativo del progetto.
- Nei tab `Dati progetto` e `Variabili`, i box consolidati si modificano solo dopo click sulla matita; i nuovi campi appena aggiunti restano liberi per il primo inserimento di titolo e valore, poi si consolidano quando si esce dal box compilato.
- Il cambio ambiente `Admin` / `Clienti` avviene dal selettore persistente nella shell e deve mantenere separato il contesto visivo e operativo.
- La lista `Progetti` mantiene l'ordine corrente finche Admin non cambia ricerca o ordinamento: selezione/apertura card, cambio tab e pin locale non devono aggiornare `Ultima modifica`; solo modifiche reali ai contenuti del progetto attivano autosave e `updated_at`.
- L'autosave del dettaglio progetto non deve ricalcolare payload pesanti non collegati alla modifica corrente: le immagini sono tracciate con firma dedicata per evitare rallentamenti durante typing e navigazione.
- All'apertura della sezione `Progetti`, l'ordinamento predefinito e alfabetico A-Z; solo un'azione esplicita di Admin puo portarlo su altri ordinamenti.
- Nella libreria `Prompt`, aprire una card e sola lettura: per modificare titolo, sezione o testo bisogna cliccare la matita accanto al cestino.
- Non usare comandi distruttivi o Git push/commit senza richiesta esplicita.
- Agent esterni accedono ai dati progetto tramite Supabase REST con header `x-app-control-project-id` e `x-app-control-agent-key`. Accesso in sola lettura, scoped al singolo progetto. Il file `.agent/app-control.json` contiene le credenziali di connessione e non va mai committato.
- Il file `.mcp.json` generato dal sync contiene token di progetto e non va mai committato.
- Dopo modifiche codice, verificare con gli script esistenti in `package.json`.
