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

Export `.env render`:

- Il pulsante `.env render` nel tab `Variabili` copia un blocco generale per deploy Render di altri progetti gestiti da App Control.
- Include sempre le chiavi standard, anche se vuote: `SUPABASE_URL`, `VITE_SUPABASE_URL`, `SUPABASE_ANON_KEY`, `VITE_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `SUPABASE_DB_URL`, `DATABASE_URL`, `GITHUB_URL`, `GITHUB_TOKEN`.
- `SUPABASE_URL` viene normalizzata senza suffisso `/rest/v1`.
- Per app frontend Vite usare solo le variabili `VITE_*` nel codice client; le chiavi server (`SERVICE_ROLE`, `DB_URL`, token) sono da usare solo in backend/server/API private.

Variabili non esposte al frontend:

- `SUPABASE_SERVICE_ROLE_KEY`
- `SUPABASE_DB_URL`
- `GITHUB_TOKEN`

Accesso app:

- PIN default iniziale: `140478`.
- Il PIN va cambiato da `Impostazioni` dopo setup.
- Lo sblocco rimane in `sessionStorage`, quindi chiudere il browser o premere `Esci` richiede nuovo PIN.

Per porta specifica:

```bash
npm run dev -- --host 127.0.0.1 --port 5001
```

## Validazione pratica

- Dopo modifiche codice: preferire `npm run check:all` quando il tempo lo consente; altrimenti almeno `npm run build`, aggiungendo `npm run lint` quando si cambia TypeScript/React.
- Dopo modifiche solo documentali: non serve build, salvo sospetto di riferimenti rotti in codice.
- Dopo modifiche UI: controllare layout desktop/mobile se il task riguarda responsive o visual.
- Dopo modifiche a manifest o icone pubbliche: eseguire almeno `npm run build` e verificare che gli asset risultino copiati in `dist`.

## Git e file generati

- La cartella puo non essere un repository Git.
- Non usare comandi distruttivi (`reset --hard`, checkout di massa, force push) senza richiesta esplicita.
- Non committare `node_modules`, `dist`, cache, `Backup_Automatico`, `.env` o export con segreti.
- I backup locali in `Backup_Automatico` devono usare il formato `Backup_7 Maggio_00.03.tar.gz`, con data e ora correnti.
- Commit e push solo se richiesti.
- Se la cartella non e ancora un repository Git, inizializzare Git solo su richiesta esplicita di commit/push, collegare il remote GitHub corretto e verificare `.gitignore` prima del primo commit.
- Remote operativo atteso per questo progetto: `https://github.com/dero975/App-Control.git`.
- Branch operativo richiesto: `main`.

## Manutenzione DNA

- Leggere prima `README_OPERATIVO.md`.
- Leggere solo i file `DNA/` pertinenti al task.
- Verificare il codice reale prima di intervenire.
- Aggiornare `DNA/` quando cambia una logica critica, un vincolo, un workflow o un'integrazione reale.
- Non aggiungere report una tantum ai file canonici: se in futuro servono audit o diagnostiche, separarli come storico e marcarli non canonici.
