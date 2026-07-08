# 02 - Data And Integrations

## Fonte dati reale oggi

- Le sezioni Progetti e Prompt usano Supabase dopo sblocco PIN app.
- Persistenza reale attiva per Progetti: `projects`, `project_data_fields`, `project_platform_accesses`, `project_env_variables`, `project_images`, `project_agent_keys`.
- Il tab `Dati progetto` include il campo `CLIENTE`, salvato come campo dati del progetto in `project_data_fields`: sostituisce il vecchio workspace Clienti separato, rimosso da codice e database.
- I tipi condivisi sono in `src/types/app.ts`.
- Client Supabase frontend in `src/lib/supabase.ts`; PIN in `src/lib/pinAccess.ts`; repository dati in `src/features/projects/projectRepository.ts`.
- Utility repository condivise in `src/lib/repositoryUtils.ts`; non duplicare normalizzazione chiavi campo o controlli duplicati nei singoli repository.
- Non esistono Supabase Storage o backend custom. E presente solo un workflow GitHub Actions separato per keepalive Supabase.

## Tipi principali

- `Project`: progetto, date `createdAt` / `updatedAt`, stato, ambiente sviluppo, GitHub, campo `linkedSecretLabel`, campi Supabase, deploy, note, prompt e immagini collegate.
- `ProjectAgentAccess`: dati minimi per collegare un progetto esterno ad App Control tramite JSON locale e prompt generico.
- `EnvVariable`: variabili Supabase/GitHub/deploy/custom con flag `sensitive`.
- `Prompt`: libreria prompt minima con `id`, `title`, `category` e `fullText`.
- `VisualAsset`: asset collegato a progetto con path e note.
- La `Dashboard` non introduce un nuovo tipo dominio persistito: deriva aggregazioni e filtri direttamente dai `Project` gia caricati.

## Vincoli dati attuali

- I nuovi progetti devono partire senza dati demo o credenziali reali.
- `ProjectAgentAccess.agentKey` viene generata localmente per progetto nel formato `XXXXX-XXXXX-XXXXX-XXXXX`; in produzione va salvata come hash e mostrata solo quando serve creare il file `.agent/app-control.json`.
- `ProjectAgentAccess.syncPrompt` deve restare generico, riutilizzabile e non modificabile dalla UI; l'identificazione del progetto passa dal JSON con `projectId` e `agentKey`.
- `projectId` (= `projects.agent_project_id`, lo slug del Sync) per i **nuovi** progetti e un codice alfanumerico casuale nel formato `prj-xxxxx` (`generateProjectId` in `projectPageModel.ts`, basato su `crypto.getRandomValues`), non derivato dal nome: univoco, stabile, mai riusato dopo un'eliminazione. NON si rigenera al rename. I progetti **esistenti** mantengono il loro slug storico (es. `nuovo-progetto-18`).
- La creazione di un nuovo progetto passa da una **modale obbligatoria** (`NameProjectModal`) che chiede il nome: niente piu nome di default "Nuovo progetto N". `createEmptyProject(name)` riceve il nome digitato; il bottone "Crea progetto" resta disabilitato finche il nome e vuoto.
- Il prompt `Sync` deve sempre trattare come fonte canonica solo le variabili realmente archiviate in App Control: `LINK_DEPLOY`, `LINK_DEPLOY ADMIN`, `GITHUB_URL`, `GITHUB_TOKEN`, `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `DATABASE_URL`, `RENDER_API_KEY`.
- `LINK_DEPLOY` e `LINK_DEPLOY ADMIN` sono input manuali dell'utente (box "Da inserire manualmente"): nessuna derivazione automatica, il valore salvato in `project_env_variables` alimenta i link sotto al titolo. L'Agent li legge ma non li scrive.
- `VITE_SUPABASE_URL` e `VITE_SUPABASE_ANON_KEY` non vengono piu salvate come input canonici: vanno derivate quando il codice reale del progetto sincronizzato usa env client-side Vite.
- `SUPABASE_DB_URL` non e piu una variabile canonica da compilare: resta solo alias derivabile di `DATABASE_URL` per script o provider che la richiedono.
- `RENDER_API_KEY` resta variabile canonica server-only e viene classificata con scope `Deploy`, non `Custom`.
- Il dettaglio progetto mostra `createdAt`; la card della lista progetti mostra solo il nome (nessuna "Ultima modifica").
- `deploy.provider` alimenta `Deploy con`, ora campo di testo libero editabile a mano (nessuna opzione prefissata ne normalizzazione).
- `getDeployLink` usa il valore del campo `deploy con` solo se e un URL; altrimenti usa `project.deploy.url`.
- `getDeployAdminLink` usa prima la variabile `LINK_DEPLOY ADMIN` se presente; in assenza di override costruisce automaticamente `${LINK_DEPLOY}/admina` rimuovendo eventuali slash finali.
- Il campo `Password` del tab `Dati progetto` oggi viene letto/scritto tramite `projects.linked_secret_label_ciphertext`, non tramite `project_data_fields`.
- `operationalNotes` viene letto e scritto nella colonna `projects.operational_notes` tramite il normale autosave del dettaglio progetto.
- Il salvataggio di `project_data_fields` e `project_env_variables` riallinea l'intero set corrente mostrato in UI. Nota UI: nei tab `Dati progetto` e `Variabili` il cestino di eliminazione per singolo campo e stato rimosso (i campi si modificano, non si eliminano dalla UI) per prevenire cancellazioni accidentali.
- Per ridurre il rischio operativo in caso di errore intermedio, il riallineamento delle relazioni progetto aggiorna o inserisce prima le righe correnti e rimuove solo alla fine le righe obsolete; non usare pattern delete-first per questi set relazionali.
- La lista `Progetti` non deve idratare tutte le relazioni al primo caricamento. `fetchProjects()` legge solo metadati da lista; `fetchProjectById()` carica campi completi, variabili, accessi, campi extra e immagini solo per il dettaglio selezionato.
- La Dashboard usa una query dedicata e non deve riusare il caricamento completo progetto: legge solo metadati, email GitHub e accessi piattaforma necessari ai riepiloghi, senza immagini, ENV o campi segreti.

## Google Sheets Backup

- Backup esterno attivo tramite Google Apps Script collegato a un Google Sheet.
- URL canonico foglio backup: `https://docs.google.com/spreadsheets/d/1bmNXfzFZpisko8M6MpN7gOnw8U3ibQGXXbEmXRBvOmA/edit?gid=832828269#gid=832828269`
- Il foglio ha solo due tab canonici:
  - `Progetti`
  - `Prompt`
- `Progetti` contiene solo campi backup essenziali: nome progetto, credenziali GitHub, variabili canoniche e note operative.
- `Prompt` contiene solo: `TITOLO`, `CATEGORIA`, `PROMPT`.
- Il foglio non sostituisce Supabase: resta una copia leggibile e ripristinabile.
- La sync usa Supabase REST in sola lettura con `SUPABASE_URL` e `SUPABASE_ANON_KEY`.
- Il backup invia a Supabase l'header dedicato `x-app-control-backup-token`; le tabelle operative non devono mantenere letture anonime libere.


## Agent API (Claude Code)

Accesso in sola lettura ai dati progetto per agent esterni tramite Supabase REST.

- Autenticazione: header `x-app-control-project-id` + `x-app-control-agent-key`.
- RLS valida la chiave contro `project_agent_keys.key_ciphertext` per il progetto specifico.
- Tabelle accessibili (solo SELECT, solo per il proprio progetto): `projects`, `project_env_variables`, `project_data_fields`, `project_platform_accesses`, `project_agent_keys`.
- Il file `.agent/app-control.json` nella root di ogni progetto contiene: `projectId`, `agentKey`, `appControlSupabaseUrl`, `appControlSupabaseAnonKey`.
- Questo file è generato dal tab Sync di App Control e non va mai committato su GitHub.
- Dettaglio completo in `DNA/05_AGENT_API.md`.

## Integrazioni future

Supabase e integrato per PIN app, sezione Progetti e libreria Prompt. Le immagini progetto sono persistite in tabella `project_images` come data URL ottimizzato.

La libreria prompt usa la tabella `prompts` e non dipende piu da mock locali. La UI crea, modifica, elimina, riordina per categoria e ricarica card reali via client Supabase anon coerente con la fase PIN.

Schema e script SQL canonici sono in `DNA/04_SUPABASE_SCHEMA_SQL.md`.

Guardrail:

- Non usare mai `SUPABASE_SERVICE_ROLE_KEY` nel frontend.
- Il PIN app e una barriera operativa leggera, non sicurezza forte enterprise.
- Non generare script SQL in blocco.
- Se richiesti script SQL, produrne uno alla volta e attendere esito prima del successivo.
- Segreti e blocchi ENV sono salvati nelle colonne `*_ciphertext` come fase ponte; prima di produzione serve cifratura applicativa reale.

## Immagini e asset

- Cartelle predisposte: `public/images`, `public/icons`, `src/assets`. Le cartelle vuote restano versionate con `.gitkeep`; `public/icons` contiene asset reali e non richiede placeholder.
- Intro app: `src/App.tsx` usa `public/icons/splash-logo.png`, variante 256x256 ottimizzata dal file `logo app`.
- Brand navbar: `src/app/Sidebar.tsx` e `src/app/AppLayout.tsx` usano `public/icons/nav-logo.png` con retina `public/icons/nav-logo@2x.png`.
- Icone installazione app: `public/manifest.webmanifest` usa `public/icons/app-icon-192.png` e `public/icons/app-icon-512.png`; iOS usa `public/icons/apple-touch-icon.png`. Questi asset sono derivati dal master locale `public/icons/Icona Schermata Home.png`, devono restare PNG nelle dimensioni 192x192, 512x512 e 180x180, e devono mantenere la composizione completa con testo visibile e margine interno sufficiente per maschere macOS/iOS/Android.
- Icone tab browser: `index.html` usa `public/icons/favicon-32.png` e `public/icons/favicon-16.png`; non usare WebP come favicon primaria per compatibilita browser.
- Il tab UI si chiama `Immagini`; il tipo dati resta `VisualAsset`.
- La UI immagini e isolata in `src/features/projects/ProjectImagesPanel.tsx` e viene caricata solo quando il tab `Immagini` viene aperto.
- I nuovi progetti mostrano sempre cinque slot immagine fissi: `Logo app`, `Logo app 2`, `Logo app 3`, `Icona Schermata Home`, `Icona Tab Browser (favicon)`.
- I file immagine inseriti nello UI tramite pulsante o drag and drop vengono ottimizzati in locale e salvati in `project_images` con `data_url`; al refresh la UI ricostruisce gli slot dai record Supabase.
- Gli slot `home-icon` e `browser-tab-icon` espongono anche un utility UI non persistita: pulsante `Copia prompt` che copia un prompt universale per chiedere a Codex/Windsurf di cercare il file sorgente con nome esatto, ottimizzarlo, integrarlo correttamente nel progetto e rimuovere il file originario non ottimizzato.
- Per `home-icon`, l'azione `Editor` resta una utility UI locale collegata allo stesso slot immagine e non introduce nuove tabelle o storage separati.
- Le immagini raster vengono ottimizzate localmente per uso web leggero: target massimo 500 KB, lato maggiore massimo 1200 px, conversione WebP quando riduce il peso. SVG non viene convertito.
- Il download delle immagini usa il nome dello slot come nome file e viene gestito dal browser nella cartella download predefinita.
- La persistenza Supabase usa `slot_id` fisso, nome card, nome file, MIME, dimensioni e `data_url` ottimizzato. `path` resta disponibile per un futuro passaggio a Supabase Storage.
- Gli slot fissi sono: `logo-app`, `logo-app-2`, `logo-app-3`, `home-icon`, `browser-tab-icon`.
- Non eliminare immagini o asset senza cercare riferimenti in codice, CSS, HTML, manifest o documentazione operativa.
- Supabase Storage non e ancora usato: le immagini restano in database come data URL ottimizzato, con limite operativo UI di 500 KB prima della codifica base64.
