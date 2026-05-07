# 00 - Context

Contesto canonico per agent. Il codice reale resta la fonte primaria: leggere questi file solo per orientarsi, poi verificare sempre i file sorgente prima di modificare.

## Stato reale

- App privata locale per gestire progetti, prompt, variabili, immagini e note operative.
- Stack: React, TypeScript, Vite, CSS custom, `lucide-react`.
- Backend custom assente. Supabase e collegato per PIN app e sezione Progetti tramite client frontend anon.
- Accesso app con PIN a 6 cifre sincronizzato su Supabase; sessione sbloccata in `sessionStorage` fino a chiusura/esci.
- La sezione Progetti legge/scrive progetti reali su Supabase dopo sblocco PIN; i mock residui in `src/data/mockData.ts` riguardano la libreria Prompt.
- Tipi dominio in `src/types/app.ts`.
- Entry point runtime: `src/main.tsx` -> `src/App.tsx` -> `src/app/AppLayout.tsx`.
- Sezioni navigabili: `Progetti`, `Prompt`, `Impostazioni`.
- La sezione `Progetti` contiene anche dati foglio, variabili, immagini, note e sync agent.

## Mappa tecnica

- `src/app`: shell, sidebar desktop, navigazione mobile.
- `src/components`: componenti condivisi (`CopyButton`, `FieldGroup`, `SectionHeader`, `EmptyState`).
- `src/features/projects`: gestione principale dei progetti e dei tab interni.
- `src/features/prompts`: libreria prompt con ricerca, filtri, dettaglio e copia.
- `src/features/settings`: placeholder essenziale.
- `src/lib/clipboard.ts`: helper condiviso per copia clipboard.
- `src/lib/supabase.ts`: client Supabase frontend con sole variabili `VITE_SUPABASE_*`.
- `src/lib/pinAccess.ts`: verifica e modifica PIN app via Supabase.
- `src/features/projects/projectRepository.ts`: accesso dati Supabase per Progetti.
- `src/styles/app.css` e `src/index.css`: stile globale e layout applicativo.

## Regole non negoziabili

- Non reintrodurre login email/password o Auth UI senza richiesta esplicita.
- Non ampliare Supabase, SQL o storage senza richiesta esplicita.
- `SUPABASE_SERVICE_ROLE_KEY`, DB URL e token GitHub devono restare solo in `.env` locale o sistemi sicuri: mai frontend, log, markdown o chat.
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
