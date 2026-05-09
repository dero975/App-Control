# App Control - README Operativo

Punto di ingresso obbligatorio per ogni agent che lavora su questo progetto.

## Ordine di lavoro

1. Leggere questo file.
2. Leggere solo i file `DNA/` pertinenti al task.
3. Verificare sempre il codice reale prima di modificare.
4. Trattare `DNA/` come contesto operativo canonico, non come sostituto del codice.
5. Aggiornare `DNA/` solo quando cambia una logica critica, un vincolo, un flusso, un'integrazione o un workflow reale.

## Stato sintetico

App Control e una web app privata locale in React, TypeScript e Vite. L'accesso app usa PIN a 6 cifre sincronizzato su Supabase; dopo sblocco resta attivo in `sessionStorage` fino a chiusura/esci. Le sezioni Progetti, Prompt e Dashboard usano dati reali coerenti con il database Supabase senza login email/password. Non esistono storage immagini o backend custom. E presente una GitHub Action separata per keepalive Supabase. E attivo anche un backup Google Sheets esterno letto da Supabase tramite Apps Script.

L'app ora e divisa in due ambienti:

- `Admin`: mantiene la logica storica con `Progetti`, `Prompt`, `Impostazioni` e `Dashboard`.
- `Clienti`: archivio clienti separato con scheda cliente, progetti cliente e dati progetto cliente.

Anche il workspace `Clienti` usa ora Supabase come fonte canonica. Non mantenere o reintrodurre persistenza locale browser come fallback dati.

Nel workspace `Admin`, la sezione principale resta `Progetti`. Dentro `Progetti` sono consolidati anche dati foglio, variabili, immagini e note. Le altre sezioni sono `Prompt`, `Impostazioni` e `Dashboard`.

## DNA canonico

- `DNA/00_CONTEXT.md`: stato reale, architettura e guardrail non negoziabili.
- `DNA/01_FLOWS.md`: flussi UI e logiche critiche attuali.
- `DNA/02_DATA_INTEGRATIONS.md`: dati reali, integrazioni attive/future e vincoli.
- `DNA/03_OPERATIONS.md`: script, validazione e workflow operativo.
- `DNA/04_SUPABASE_SCHEMA_SQL.md`: schema Supabase target e script SQL ordinati.

## Regole operative

- Il codice reale e fonte primaria.
- Non creare documentazione parallela o doppia.
- Non introdurre backend, Supabase, SQL, auth o storage senza richiesta esplicita.
- Supabase e gia integrato per `Progetti`, `Prompt` e PIN app: non usare `SUPABASE_SERVICE_ROLE_KEY` nel frontend e non loggare mai segreti.
- Non inserire segreti reali in codice, mock o documentazione.
- In `Agent sync`, mantenere solo prompt generico stabile non modificabile e JSON di collegamento per progetto; non duplicare chiavi o credenziali in viste parallele. Le variabili canoniche archiviate in App Control sono `LINK_DEPLOY`, `GITHUB_URL`, `GITHUB_TOKEN`, `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `DATABASE_URL`; `LINK_DEPLOY ADMIN`, eventuali `VITE_SUPABASE_*` e `SUPABASE_DB_URL` vanno derivate solo quando il codice o il provider le richiedono.
- Il backup Google Sheets usa solo due tab canonici: `Progetti` e `Prompt`. Serve come copia leggibile e ripristinabile, non come fonte primaria o canale di editing.
- In `Immagini`, mantenere cinque slot fissi sempre disponibili; il database futuro deve persistere metadati e path Storage, non data URL come fonte canonica.
- Non creare dashboard o voci sidebar per `Dati progetto` e `Immagini`.
- Su mobile la home `Progetti` e una vista compatta separata: mostra solo card con nome progetto e, all'apertura, i link `LINK_DEPLOY` e `LINK_DEPLOY ADMIN`; il dettaglio completo progetto resta una logica desktop fino a nuova richiesta.
- Il cambio ambiente `Admin` / `Clienti` avviene dal selettore persistente nella shell e deve mantenere separato il contesto visivo e operativo.
- La lista `Progetti` mantiene l'ordine corrente finche Admin non cambia ricerca o ordinamento: la selezione/apertura di un progetto e gli autosave del dettaglio non devono rimescolare le card.
- All'apertura della sezione `Progetti`, l'ordinamento predefinito e alfabetico A-Z; solo un'azione esplicita di Admin puo portarlo su altri ordinamenti.
- Non usare comandi distruttivi o Git push/commit senza richiesta esplicita.
- Dopo modifiche codice, verificare con gli script esistenti in `package.json`.
