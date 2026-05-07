# 02 - Data And Integrations

## Fonte dati reale oggi

- Le sezioni Progetti e Prompt usano Supabase dopo sblocco PIN app.
- Persistenza reale attiva per Progetti: `projects`, `project_data_fields`, `project_platform_accesses`, `project_env_variables`, `project_images`, `project_agent_keys`.
- I tipi condivisi sono in `src/types/app.ts`.
- Client Supabase frontend in `src/lib/supabase.ts`; PIN in `src/lib/pinAccess.ts`; repository dati in `src/features/projects/projectRepository.ts`.
- Non esistono Supabase Storage, backend custom o workflow CI.

## Tipi principali

- `Project`: progetto, date `createdAt` / `updatedAt`, stato, ambiente sviluppo, GitHub, campo `linkedSecretLabel`, campi Supabase, deploy, note, prompt e immagini collegate.
- `ProjectAgentAccess`: dati minimi per collegare un progetto esterno ad App Control tramite JSON locale e prompt generico.
- `EnvVariable`: variabili Supabase/GitHub/deploy/custom con flag `sensitive`.
- `Prompt`: libreria prompt minima con `id`, `title`, `category` e `fullText`.
- `VisualAsset`: asset collegato a progetto con path e note.

## Vincoli dati attuali

- I nuovi progetti devono partire senza dati demo o credenziali reali.
- `developmentEnvironment` e il campo UI `sviluppo in` usano i valori base `Windsurf` e `Replit`; la UI mantiene fallback per eventuali valori esterni non previsti.
- `ProjectAgentAccess.agentKey` viene generata localmente per progetto nel formato `XXXXX-XXXXX-XXXXX-XXXXX`; in produzione va salvata come hash e mostrata solo quando serve creare il file `.agent/app-control.json`.
- `ProjectAgentAccess.syncPrompt` deve restare generico, riutilizzabile e non modificabile dalla UI; l'identificazione del progetto passa dal JSON con `projectId` e `agentKey`.
- Il dettaglio progetto mostra `createdAt`; la lista progetti mostra `updatedAt` come `Ultima modifica`.
- Gli accessi piattaforma del box `sviluppo in` vengono salvati in `project_platform_accesses` solo quando creati dall'utente e salvati.
- I nuovi progetti partono senza righe `Accessi piattaforme`; ogni accesso viene creato esplicitamente dall'utente.
- `deploy.provider` alimenta `Deploy con`; se non e tra le opzioni, la UI usa fallback.
- `getDeployLink` usa il valore del campo `deploy con` solo se e un URL; altrimenti usa `project.deploy.url`.
- Il campo `Password` del tab `Dati progetto` oggi viene letto/scritto tramite `projects.linked_secret_label_ciphertext`, non tramite `project_data_fields`.
- `operationalNotes` viene letto dalla colonna `projects.operational_notes` e la UI lo include nello snapshot di autosave; verificare sempre il codice repository prima di assumere persistenza completa degli update.

## Integrazioni future

Supabase e integrato per PIN app, sezione Progetti e libreria Prompt. Le immagini progetto sono persistite in tabella `project_images` come data URL ottimizzato.

La libreria prompt usa la tabella `prompts` e non dipende piu da mock locali. La UI crea, modifica, elimina e ricarica card reali via client Supabase anon coerente con la fase PIN.

Schema e script SQL canonici sono in `DNA/04_SUPABASE_SCHEMA_SQL.md`.

Guardrail:

- Non usare mai `SUPABASE_SERVICE_ROLE_KEY` nel frontend.
- Il PIN app e una barriera operativa leggera, non sicurezza forte enterprise.
- Non generare script SQL in blocco.
- Se richiesti script SQL, produrne uno alla volta e attendere esito prima del successivo.
- Segreti e blocchi ENV sono salvati nelle colonne `*_ciphertext` come fase ponte; prima di produzione serve cifratura applicativa reale.

## Immagini e asset

- Cartelle predisposte: `public/images`, `public/icons`, `src/assets`.
- Intro app: `src/App.tsx` usa `public/icons/splash-logo.png`, variante 256x256 ottimizzata dal file `logo app`.
- Brand navbar: `src/app/Sidebar.tsx` e `src/app/AppLayout.tsx` usano `public/icons/nav-logo.png` con retina `public/icons/nav-logo@2x.png`.
- Icone installazione app: `public/manifest.webmanifest` usa `public/icons/app-icon-192.png` e `public/icons/app-icon-512.png`; iOS usa `public/icons/apple-touch-icon.png`.
- Icone tab browser: `index.html` usa `public/icons/favicon-32.png` e `public/icons/favicon-16.png`; non usare WebP come favicon primaria per compatibilita browser.
- Il tab UI si chiama `Immagini`; il tipo dati resta `VisualAsset`.
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
