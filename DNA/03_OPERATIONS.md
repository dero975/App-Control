# 03 - Operations

## Script

Usare solo script presenti in `package.json`:

```bash
npm run dev
npm run build
npm run lint
npm run preview
npm run typecheck
npm run check:all
```

- `build` esegue `tsc -b` e `vite build`.
- Prima di TypeScript/Vite, `build` esegue anche `scripts/validate-vite-env.mjs`: oltre alle variabili Supabase richieste, blocca variabili `VITE_*` con nomi o valori compatibili con segreti server-only.
- `typecheck` esegue `tsc -b --noEmit`.
- `check:all` esegue `typecheck`, `lint` e `build` in sequenza.
- Non dichiarare test passati se non sono stati eseguiti.

## Avvio locale

```bash
npm install
npm run dev
```

Richiede `.env` locale per Supabase:

- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`

## Deploy Render

Configurazione produzione verificata il `7 Maggio 2026`:

- tipo servizio: `Static Site`
- repository: `dero975/App-Control`
- branch deploy: `main`
- root directory: vuota
- build command: `npm install && npm run build`
- publish directory: `dist`
- environment: `Production`

Variabili ambiente richieste su Render per questa app:

- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`

Regole operative Render:

- `VITE_SUPABASE_URL` deve essere la base URL del progetto Supabase, senza suffisso `/rest/v1`.
- Non inserire nel servizio statico variabili server-only come `SUPABASE_SERVICE_KEY`, `DATABASE_URL`, `GITHUB_TOKEN` o altri segreti non destinati al client.
- Per questa app Render ospita solo il frontend buildato; il backend applicativo resta Supabase.
- L'auto-deploy corretto e GitHub `main` -> Render `Static Site`.
- `npm run build` valida prima della build la presenza di `VITE_SUPABASE_URL` e `VITE_SUPABASE_ANON_KEY`; su Render queste variabili devono esistere prima del deploy, perche Vite le incorpora nel bundle statico in fase di build.

## Keepalive Supabase

Workflow presente:

- `.github/workflows/supabase-keepalive.yml`

Scopo:

- ping esterno ogni 24 ore circa per ridurre il rischio di pausa su Supabase Free;
- nessuna scrittura dati;
- nessuna modifica del runtime app.

Comportamento:

- trigger schedulato giornaliero piu `workflow_dispatch` manuale;
- usa `curl` con retry, timeout connessione e timeout totale;
- normalizza `SUPABASE_URL` rimuovendo un eventuale suffisso `/rest/v1`;
- esegue una sola richiesta REST su `prompts?select=id&limit=0`, verificando l'API senza leggere righe applicative.

Secrets GitHub Actions richiesti:

- `SUPABASE_URL`
- `SUPABASE_ANON_KEY`

Regole:

- non usare `SUPABASE_SERVICE_KEY` per il keepalive;
- il keepalive resta infrastruttura esterna: non reintrodurre polling nel frontend.

## Backup Google Sheets

Configurazione esterna verificata il `8 Maggio 2026`:

- progetto Apps Script: `App Control Backup Sync`
- URL foglio backup: `https://docs.google.com/spreadsheets/d/1bmNXfzFZpisko8M6MpN7gOnw8U3ibQGXXbEmXRBvOmA/edit?gid=832828269#gid=832828269`
- sorgente dati: Supabase REST in sola lettura
- Script Properties richieste:
  - `SUPABASE_URL`
  - `SUPABASE_ANON_KEY`
- foglio target con due tab canonici:
  - `Progetti`
  - `Prompt`

Funzioni Apps Script attive:

- `syncAppControlBackup`
- `syncProjectsTab`
- `syncPromptsTab`
- `fetchSupabaseRows`
- `writeSheetData`
- `onOpen`
- `createDailySyncTrigger`

Comportamento operativo:

- menu manuale nel foglio: `App Control > Sincronizza backup`
- trigger automatico giornaliero su `syncAppControlBackup`
- `SUPABASE_URL` viene normalizzata rimuovendo un eventuale suffisso `/rest/v1`
- la sync riscrive solo i contenuti dalla riga 2 in poi, lasciando intatti header, filtri e formattazione

Regole:

- il backup Google Sheets non scrive mai in Supabase
- non usare `SUPABASE_SERVICE_KEY` nello script di backup
- il foglio resta backup leggibile, non fonte primaria o canale di editing
- il backup legge Supabase tramite header dedicato `x-app-control-backup-token`; non riaprire letture anonime libere sulle tabelle operative.

Export `.env render`:

- Il pulsante `.env render` nel tab `Variabili` copia un blocco generale per deploy Render di altri progetti gestiti da App Control.
- In App Control le variabili canoniche da compilare sono: `LINK_DEPLOY`, `GITHUB_URL`, `GITHUB_TOKEN`, `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_KEY`, `DATABASE_URL`.
- `LINK_DEPLOY ADMIN` viene derivata automaticamente da `LINK_DEPLOY` con suffisso `/admina`; va compilata manualmente solo se serve un percorso admin diverso.
- Il blocco `.env render` genera poi anche le chiavi derivate richieste da alcuni stack o provider: `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`, `SUPABASE_DB_URL`.
- `SUPABASE_URL` viene normalizzata senza suffisso `/rest/v1`.
- Per app frontend Vite usare solo le variabili `VITE_*` nel codice client; le chiavi server (`SERVICE_ROLE`, `DATABASE_URL`, token) sono da usare solo in backend/server/API private.

Variabili non esposte al frontend:

- `SUPABASE_SERVICE_KEY`
- `DATABASE_URL`
- `GITHUB_TOKEN`

Accesso app:

- Il PIN iniziale va configurato solo nel database durante il setup e non va documentato in chiaro nel repository.
- Il PIN va cambiato da `Impostazioni` dopo setup o rotazione.
- Il cambio PIN deve passare da RPC dedicata; non riaprire update diretti anon/authenticated su `app_control_settings`.
- Il dispositivo attendibile usa un token casuale locale: il DB salva solo hash, scadenza e revoca.
- Il token dispositivo passa come header `x-app-control-device-token`; non salvare PIN o hash PIN in `localStorage`.
- Alla rotazione del PIN, revocare i dispositivi attendibili esistenti.
- Lo sblocco rimane in `sessionStorage`, quindi chiudere il browser o premere `Esci` richiede nuovo PIN.

Per porta specifica:

```bash
npm run dev -- --host 127.0.0.1 --port 5001
```

## Validazione pratica

- Dopo modifiche codice: preferire `npm run check:all` quando il tempo lo consente; altrimenti almeno `npm run build`, aggiungendo `npm run lint` quando si cambia TypeScript/React.
- Il workspace `Clienti` salva su Supabase; dopo modifiche a quel dominio verificare almeno creazione, modifica, eliminazione e ripristino al refresh di clienti e progetti cliente, piu persistenza di accessi piattaforme, variabili e campi aggiuntivi.
- Dopo modifiche solo documentali: non serve build, salvo sospetto di riferimenti rotti in codice.
- Dopo modifiche UI: controllare layout desktop/mobile se il task riguarda responsive o visual.
- Dopo modifiche a manifest o icone pubbliche: eseguire almeno `npm run build` e verificare che gli asset risultino copiati in `dist`.

## Git e file generati

- La cartella puo non essere un repository Git.
- Non usare comandi distruttivi (`reset --hard`, checkout di massa, force push) senza richiesta esplicita.
- Non committare `node_modules`, `dist`, cache, `BACKUP`, `Backup_Automatico`, `.env` o export con segreti.
- I backup locali in `BACKUP` devono usare il formato `Backup_7 Maggio_00.03.tar.gz`, con data e ora correnti.
- Il backup locale operativo deve includere solo materiale utile a ricostruire il progetto: file tracciati del repository come `src/`, `public/`, `.github/`, `DNA/`, `README*.md`, configurazioni versionate e anche il file `.env` operativo locale quando presente.
- Il backup locale operativo deve mantenere disponibile l'ambiente locale del progetto anche in caso di export, copia o ripristino su un altro PC; per questo `.env` va incluso nel backup locale ma continua a restare escluso da commit e push.
- Il backup locale operativo deve escludere sempre `.git`, altri export locali con segreti esterni al runtime del progetto, `node_modules`, `dist`, cache, artefatti generati e gli archivi gia presenti dentro `BACKUP/` o `Backup_Automatico/`.
- Commit e push solo se richiesti.
- Se la cartella non e ancora un repository Git, inizializzare Git solo su richiesta esplicita di commit/push, collegare il remote GitHub corretto e verificare `.gitignore` prima del primo commit.
- Remote operativo atteso per questo progetto: `https://github.com/dero975/App-Control.git`.
- Branch operativo richiesto: `main`.
- Prima di commit/push verificare almeno `git status --short --branch`, `git remote -v` e `git branch --show-current`.
- Prima del push eseguire preferibilmente `npm run check:all` se il commit contiene codice o stile; per commit solo documentali bastano controlli mirati e verifica stato Git.
- Push previsto: `git push origin main`, senza `--force`.
- Se il commit modifica file sotto `.github/workflows/`, il token GitHub usato per il push deve avere anche lo scope `workflow`, altrimenti GitHub rifiuta l'aggiornamento del workflow.

## Manutenzione DNA

- Leggere prima `README_OPERATIVO.md`.
- Leggere solo i file `DNA/` pertinenti al task.
- Verificare il codice reale prima di intervenire.
- Aggiornare `DNA/` quando cambia una logica critica, un vincolo, un workflow o un'integrazione reale.
- Non aggiungere report una tantum ai file canonici: se in futuro servono audit o diagnostiche, separarli come storico e marcarli non canonici.
