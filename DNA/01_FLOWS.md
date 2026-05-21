# 01 - Flows

Documenta solo i flussi che riducono rischio operativo. Per dettagli di rendering, leggere i componenti.

## Navigazione

- `App` tiene in stato ambiente attivo e sezione attiva per ciascun ambiente.
- Alla prima apertura della sessione browser, `App` mostra `IntroSplash` per 4.5 secondi prima della shell o del PIN. Nella stessa sessione non viene ripetuta a ogni remount, perche il flag resta in `sessionStorage`. Sfondo intro stabile; logo e testo `by Dero` fanno fade in/out sullo stesso tempo del passaggio, evitando una fase finale vuota.
- `PinLockPage` non deve essere caricata lazy: e parte del percorso critico di avvio, cosi il passaggio intro -> PIN non riusa lo splash come fallback e non crea un secondo flash.
- Prima della shell, `App` mostra `PinLockPage` se `sessionStorage` non contiene lo sblocco app e non esiste un token dispositivo attendibile valido.
- PIN valido: 6 cifre; il PIN viene salvato come hash in Supabase e non deve avere fallback hardcoded nel codice.
- La schermata PIN deve essere responsive anche su iPhone stretti: pannello e input usano `box-sizing` locale e larghezza mobile limitata per evitare overflow orizzontale.
- Dopo PIN corretto, lo sblocco resta valido fino a chiusura browser o comando `Esci`.
- `Ricorda questo dispositivo` e attivo di default nella schermata PIN. Se resta selezionato, il browser salva un token casuale locale ad alta entropia; Supabase conserva solo l'hash del token e autorizza le richieste tramite `x-app-control-device-token`.
- A ogni nuova sessione, se esiste un token locale e il comando `Esci` non ha sospeso lo sblocco nella sessione corrente, `App` verifica il token prima di mostrare la schermata PIN. Durante questa verifica resta visibile lo splash, cosi un dispositivo valido non vede il PIN lampeggiare.
- Il comando `Esci` blocca la sessione corrente e sospende lo sblocco automatico finche non viene reinserito il PIN nella stessa sessione browser.
- `AppLayout` rende sidebar desktop, switch ambiente `Admin` / `Clienti`, nav mobile e contenuto principale.
- `main.tsx` forza identita browser `App Control` e asset favicon/manifest versionati. In locale pulisce solo vecchi service worker/cache dell'origine `localhost` o `127.0.0.1`, per evitare che progetti precedenti riusino titolo, icona o PWA sullo stesso numero di porta.
- La sidebar desktop `Admin` espone in basso i link esterni operativi: `Token Github` apre la creazione token GitHub in nuova finestra; `Auth Github 8` copia negli appunti il comando `gh auth login -h github.com -p https -w` e mostra un popup temporaneo chiaro per aprire Terminale e incollare; `Foglio Google` apre il backup Google Sheets.
- Nella nav mobile il logo `App Control` resta centrato nella fascia superiore; sotto al logo la barra mantiene switch ambiente e select del contesto attivo.
- Su desktop la sidebar e la pagina `Progetti` restano bloccate nel viewport; scorrono solo lista progetti e liste card interne dei tab quando necessario.
- `navigation.ts` definisce una nav distinta per i due ambienti:
  - `Admin`: `projects`, `prompts`, `dashboard`, `settings`
  - `Clienti`: `customers`, con lista clienti reale resa direttamente nella sidebar

## Clienti

Fonte principale: `src/features/customers/CustomersPage.tsx`.

- L'ambiente `Clienti` e separato dal dominio admin e usa una palette chiara bianco/ambra tramite override dei token CSS nella shell.
- La sidebar dell'ambiente `Clienti` mostra direttamente l'elenco clienti come card selezionabili, piu i controlli `Cerca cliente` e `Nuovo cliente`; il contenuto principale mostra il dettaglio del cliente attivo.
- Nel dettaglio cliente, il blocco anagrafica resta sempre in alto sotto il nome visualizzato cliente; sotto a quel blocco parte la gestione dei progetti cliente, mantenendo un'impostazione il piu possibile coerente con l'area `Admin`.
- `Nuovo cliente` crea un record Supabase con nome placeholder, contatti vuoti, note e lista progetti vuota.
- Il blocco dati cliente parte chiuso di default e, quando aperto, espone `Nome`, `Cognome`, `Azienda`, `Email`, `Email sviluppo`, `Password` e `Note cliente`.
- Sotto il blocco dati cliente, la sezione progetti mostra solo i progetti del cliente selezionato.
- `Nuovo progetto cliente` crea un record Supabase collegato al cliente corrente con set ENV canonico iniziale e campo extra `Password deploy`.
- Il caricamento iniziale dei progetti cliente deve restare leggero: la lista legge solo metadati essenziali e il dettaglio completo del progetto selezionato viene idratato da Supabase su richiesta.
- La colonna progetti cliente usa la stessa toolbar dell'area `Admin`: `Cerca..`, toggle ordinamento alfabetico, pulsante nuovo progetto e pulsante ordinamento per ultima modifica.
- Le card progetti cliente mostrano solo nome progetto in maiuscolo e `Ultima modifica`; la preview ambiente/deploy resta fuori dalla card lista. L'elenco non deve avere un container/pannello esterno separato dalla pagina.
- Ogni card progetto cliente puo essere fissata in alto con puntina ambra piena e inclinata quando attiva, senza contorno. La preferenza resta locale al browser e al cliente corrente tramite `localStorage`, senza scrivere su Supabase.
- Il dettaglio progetto cliente usa gli stessi cinque tab di `Admin`: `Dati progetto`, `Variabili`, `Immagini`, `Note`, `Sync`.
- `Dati progetto` e `Variabili` riusano la stessa struttura editor dell'area `Admin`; in `Clienti` cambia solo la palette visiva del workspace.
- `Immagini` e `Sync` esistono anche nel dettaglio cliente per allineamento di layout e navigazione; oggi non hanno ancora persistenza/integrazione cliente dedicata.
- Il workspace `Clienti` salva su Supabase con debounce breve per update e mostra stato esplicito di salvataggio.
- Su mobile la lista progetti cliente non mostra piu il dettaglio completo inline sotto la card. Toccando una card si espandono i link deploy disponibili e il pulsante `Apri scheda progetto`, che apre una scheda fullscreen dedicata al progetto cliente con gli stessi tab reali del dettaglio desktop.

## Progetti

Fonti principali: `src/features/projects/ProjectsPage.tsx`, `src/features/projects/VariablesPanel.tsx`, `src/features/projects/ProjectImagesPanel.tsx`.

- Se Supabase e configurato, la sezione Progetti usa il client anon dopo sblocco PIN.
- Vista principale con lista progetti a sinistra e dettaglio a destra.
- Il caricamento iniziale della sezione Progetti deve restare leggero: la lista legge solo metadati essenziali e il dettaglio completo, incluse relazioni e immagini, viene caricato da Supabase solo per il progetto selezionato.
- La lista progetti supporta ricerca locale, ordinamento alfabetico bidirezionale e ordinamento per ultima modifica dal piu recente al piu vecchio; di default all'apertura parte in ordine alfabetico A-Z.
- Le card lista progetti mostrano solo nome progetto in maiuscolo e `Ultima modifica`, con separazione visiva minima fra card, sfondo bianco sulla selezione, contorno verde scuro evidente e senza container/pannello esterno dell'elenco.
- Il nome progetto viene normalizzato in maiuscolo in creazione, visualizzazione e modifica del campo `nome progetto`, sia in `Admin` sia in `Clienti`.
- Ogni card progetto puo essere fissata in alto con puntina ambra piena e inclinata quando attiva, senza contorno. La preferenza resta locale al browser tramite `localStorage`, senza scrivere su Supabase e senza modificare la logica del pulsante `ultima modifica`.
- `Ultima modifica` cambia solo quando vengono salvate modifiche reali ai contenuti del progetto. Selezione card, apertura dettaglio, cambio tab, pin locale e riordinamento lista non devono aggiornare `projects.updated_at`.
- Una volta applicati ricerca e ordinamento, la lista mantiene quell'ordine finche Admin non cambia davvero i filtri: selezionare un progetto o aggiornarne i dati non deve rimescolare le card.
- Su mobile la home `Progetti` mostra card compatte. Toccando una card si espandono `LINK_DEPLOY`, `LINK_DEPLOY ADMIN` e il pulsante `Apri scheda progetto`.
- `Apri scheda progetto` apre una scheda fullscreen mobile dedicata, che riusa lo stesso dettaglio reale del desktop con i tab `Dati progetto`, `Variabili`, `Immagini`, `Note`, `Sync`.
- La scheda fullscreen mobile e usata sia in `Admin` sia in `Clienti`, con header dedicato e chiusura esplicita; il dettaglio laterale resta limitato al desktop.
- `Nuovo progetto` crea un progetto in Supabase con campi vuoti, `agent_project_id`, Agent Key nel formato `XXXXX-XXXXX-XXXXX-XXXXX`, hash chiave e prompt sync generico.
- `Elimina progetto` apre una modale di conferma e rimuove il progetto da Supabase; le tabelle figlie vengono rimosse via cascade.
- Le modifiche al dettaglio progetto vengono salvate automaticamente su Supabase con debounce breve; non esiste pulsante manuale `Salva modifiche`.
- La firma di autosave separa le immagini dai campi testuali: gli slot immagine vengono serializzati solo quando cambiano, cosi typing e navigazione non ricalcolano data URL pesanti.
- Durante l'autosave il dettaglio mostra uno stato esplicito `Salvataggio in corso`, `Salvataggio completato` oppure il messaggio di errore restituito dal repository.
- Selezionando un progetto si torna sempre al tab `Dati progetto`.
- Tab interni: `Dati progetto`, `Variabili`, `Immagini`, `Note`, `Sync`.
- Il tab `Immagini` e caricato in lazy loading: canvas, ottimizzazione immagini e modali restano fuori dal chunk iniziale di `Progetti` finche il tab non viene aperto.
- L'header dettaglio mostra titolo progetto, link deploy se presente e `Data creazione` formattata sotto al link.
- Se `LINK_DEPLOY` e presente, l'header dettaglio mostra anche il link admin derivato `.../admina`; il valore puo essere sovrascritto dalla variabile `LINK_DEPLOY ADMIN`.
- `Dati progetto` usa `buildSheetFields(project)` e presenta righe editabili; il salvataggio scrive core fields, campi custom e accessi piattaforme.
- I box gia consolidati di `Dati progetto` e `Variabili` sono in sola lettura finche Admin non clicca la matita del box. I campi appena aggiunti restano subito editabili per il primo inserimento e permettono anche di compilare il titolo del campo; quando Admin esce dal nuovo box dopo avere inserito titolo o valore, il box viene consolidato e rientra nella logica matita.
- I titoli dei campi custom possono essere modificati in modalita matita. I titoli canonici che alimentano logiche o sincronizzazioni restano protetti per non rompere mapping Supabase, deploy, GitHub e sync.
- Il salvataggio dei campi custom riallinea completamente `project_data_fields`: le righe rimosse dalla UI non devono ricomparire al reload.
- `Variabili` usa `buildProjectVariables(project)` e ordina variabili tecniche con `orderedProjectKeys`; il salvataggio scrive `project_env_variables`.
- Il salvataggio delle variabili riallinea completamente `project_env_variables`: le chiavi eliminate dalla UI non devono ricomparire al reload.
- Nel tab `Variabili`, `LINK_DEPLOY` e `LINK_DEPLOY ADMIN` sono raggruppate nello stesso container; `LINK_DEPLOY ADMIN` nasce automaticamente da `LINK_DEPLOY` aggiungendo `/admina`, ma resta modificabile manualmente dall'admin.
- `Immagini` mostra gli asset visivi collegati al progetto senza blocco cartelle e senza pulsanti copia path.
- `Note` espone `operationalNotes` in textarea editabile locale; il valore entra nello snapshot di autosave del dettaglio progetto e viene persistito nella colonna `projects.operational_notes`.
- Se `Note` contiene testo, il tab `Note` mostra un segnale visivo rosso morbido per evidenziare la presenza di contenuto senza usare lampeggi aggressivi.
- `Sync` contiene il blocco `Agent sync`: espone prima il prompt generico stabile in blocco statico non modificabile e poi il JSON `.agent/app-control.json` specifico del progetto; non duplica Project ID o Agent Key in card separate.
- Il prompt `Sync` deve istruire l'agent a partire sempre dai dati canonici salvati in App Control: `Nome progetto`, `Mail accesso`, `Password`, `Sviluppo in`, `Accessi piattaforme`, `Deploy con`, `Password`, piu le variabili `LINK_DEPLOY`, `GITHUB_URL`, `GITHUB_TOKEN`, `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_KEY`, `DATABASE_URL`.
- `LINK_DEPLOY ADMIN` non e una variabile canonica da compilare a mano: il flusso `Sync` deve trattarla come derivata di `LINK_DEPLOY`, salvo override manuale gia presente nel progetto.
- Se il progetto sincronizzato usa Vite o altre env client-side, `VITE_SUPABASE_URL` e `VITE_SUPABASE_ANON_KEY` vanno derivate rispettivamente da `SUPABASE_URL` e `SUPABASE_ANON_KEY`; non devono essere attese come campi separati dentro App Control.
- Se uno script o un provider richiede `SUPABASE_DB_URL`, va trattata come alias di `DATABASE_URL` e generata solo quando necessaria.
- Il prompt di sincronizzazione non deve essere rigenerato per ogni progetto: identifica il flusso. Il JSON cambia per progetto e contiene `projectId` e `agentKey`.
- In `Agent sync`, le icone copia stanno dentro al box relativo e non hanno testo o contorno.
- Nella lista progetti non mostrare preview tecniche come `sviluppo in / deploy con`, stato o conteggio immagini: nella card lista restano solo titolo, ultima modifica e puntina.
- Le icone cestino delle card editabili devono restare allineate alla riga del controllo bianco, anche quando la card contiene contenuti extra sotto.
- La pagina `Impostazioni` include la rimozione del dispositivo attendibile del browser corrente.

## Campi speciali in Dati progetto

- `Password`: label canonica; non e trattata come campo sensibile nel tab `Dati progetto`, quindi resta visibile.
- `sviluppo in`: select con opzioni `Windsurf`, `Replit`, piu voce `+ Aggiungi` dentro al menu.
- Dentro `sviluppo in`, `Accessi piattaforme` mostra il pulsante `Aggiungi accesso`; le righe piattaforma/mail/password sono visibili solo dopo creazione esplicita. Possono coesistere accessi separati per Windsurf, Replit o piattaforme custom.
- `deploy con`: select con opzioni `Render`, `CloudeFlare`, piu voce `+ Aggiungi` dentro al menu.
- Se un valore non previsto arriva ai select, il codice usa fallback del campo.
- `+ Aggiungi` apre `window.prompt` e salva il nuovo valore nello stato locale del pannello.

## Immagini

- Il tab `Immagini` mostra sempre cinque slot fissi: `Logo app`, `Logo app 2`, `Logo app 3`, `Icona Schermata Home`, `Icona Tab Browser (favicon)`.
- Ogni slot consente inserimento file immagine locale tramite pulsante o drag and drop, anteprima, scaricamento del file inserito e rimozione del file dalla sessione.
- Le card `Icona Schermata Home` e `Icona Tab Browser (favicon)` espongono anche un pulsante piccolo `Copia prompt` accanto al titolo, che copia negli appunti un prompt operativo universale per Codex/Windsurf, specifico per quel tipo di icona.
- Clic sulla miniatura immagine apre una modale preview dedicata con immagine grande e header coerente con il logo della nav.
- Lo slot `Icona Schermata Home` espone anche `Editor` accanto al titolo: apre una modale grande basata su canvas 512x512, con sfondo colore/sfumatura lineare, radiale o morbida, campione colore tramite `EyeDropper` dove supportato, bordo opzionale, logo inseribile via drag and drop sull'anteprima o file picker e scala proporzionale. Se `Logo app` contiene gia un'immagine e lo slot Home e vuoto, l'editor la usa come logo iniziale. Il salvataggio genera un PNG finale nello stesso slot e passa dal normale autosave Supabase.
- Il reset generale dell'editor icona Home ripristina colori bianchi, bordo disattivato, scala logo standard e rimuove il logo importato dalla preview. I blocchi `Sfondo` e `Bordo` hanno anche reset indipendenti.
- Le immagini raster vengono ottimizzate client-side prima del salvataggio in `project_images`: limite massimo target 500 KB, lato maggiore massimo 1200 px, output WebP quando serve comprimere. SVG resta invariato.
- Il download usa sempre il titolo della card come nome file, mantenendo l'estensione coerente con il formato salvato.
- La cartella di destinazione download e quella predefinita del browser/PC; la web app non forza path locali arbitrari.
- Le card restano visibili anche se non viene inserita nessuna immagine.
- Quando uno slot e vuoto, il riquadro miniatura resta bianco di default.
- Se un nome contiene una nota tra parentesi, la nota e renderizzata come testo secondario non bold.

## Variabili ENV e Render

Fonte: `src/features/projects/VariablesPanel.tsx`.

- Il pulsante `.env render` nel tab `Variabili` copia un preset generale per deploy Render di altri progetti.
- In App Control le variabili canoniche da compilare sono: `LINK_DEPLOY`, `GITHUB_URL`, `GITHUB_TOKEN`, `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_KEY`, `DATABASE_URL`.
- `LINK_DEPLOY ADMIN` viene derivata automaticamente da `LINK_DEPLOY` con suffisso `/admina`; se l'admin modifica quel valore, la derivazione automatica non deve sovrascrivere il custom value.
- Il pulsante `.env render` genera automaticamente anche le variabili derivate richieste da alcuni stack o provider: `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`, `SUPABASE_DB_URL`.
- `SUPABASE_URL` e l'eventuale `VITE_SUPABASE_URL` derivata vengono normalizzate senza suffisso `/rest/v1`.
- Il blocco puo contenere segreti: non stamparlo in log o documentazione.

## Prompt

Fonte: `src/features/prompts`.

- La pagina `Prompt` e una libreria essenziale di card operative.
- Le categorie canoniche attuali sono `Prompt iniziali`, `Prompt manutenzione` e `Prompt vari`.
- Ogni card mostra solo il titolo; la categoria resta come filtro della pagina e non viene ripetuta nel corpo della card. Il testo completo del prompt si visualizza solo quando la card viene aperta con click.
- Il pulsante copia e sempre disponibile sulla card anche quando il prompt e chiuso; non esiste piu il secondo pulsante copia nel footer aperto.
- I prompt della libreria vengono caricati da Supabase all'apertura della pagina. Nessuna card deve risultare aperta di default al primo caricamento.
- `Nuovo prompt` crea un record reale in `prompts` tramite modale dedicata.
- Aprire una card prompt serve solo a leggere il contenuto. La modifica di titolo, sezione e testo richiede click esplicito sulla matita accanto al cestino; solo in modalita modifica gli input scrivono con autosave debounced verso Supabase. Le icone azione della card restano compatte e allineate a destra.
- Nelle tre viste categoria (`Prompt iniziali`, `Prompt manutenzione`, `Prompt vari`) Admin puo riordinare manualmente le card; l'ordine viene persistito su Supabase e deve sopravvivere al riavvio dell'app.
- La vista `Tutte` non usa l'ordinamento manuale categoria: mostra sempre i prompt in ordine alfabetico per titolo.
- Eliminazione prompt parte direttamente dalla card ma passa da una modale di conferma prima della rimozione reale da Supabase.
- `Copia prompt` copia sempre il nome del prompt su una sola riga, seguito da una riga vuota e poi dal testo completo del prompt; se il testo salvato contiene gia una prima riga `Titolo: ...` identica al nome, quella riga viene rimossa per evitare duplicazioni.
- Non esistono piu pannello dettaglio laterale, tag, note d'uso, preferiti o data ultima modifica.

## Impostazioni

Fonte: `src/features/settings/SettingsPage.tsx`.

- La pagina `Impostazioni` gestisce cambio PIN e stato del dispositivo attendibile del browser corrente.
- `Modifica PIN`: richiede PIN attuale, nuovo PIN e conferma; aggiorna l'hash in Supabase.
- `Dispositivo attendibile`: mostra stato corrente e consente di dimenticare il browser solo quando esiste un token locale. Il blocco resta in un unico container e il pulsante disabilitato non deve evidenziarsi in hover.
- Il logout non e piu duplicato nella pagina `Impostazioni`: resta solo nella navigazione dell'app.

## Dashboard

Fonte: `src/features/dashboard/DashboardPage.tsx`.

- La pagina `Dashboard` e una vista riepilogativa read-only costruita dai dati reali dei progetti.
- Mostra solo informazioni utili derivabili da `Dati progetto` e dagli `Accessi piattaforme` collegati a `sviluppo in`.
- La tabella espone: nome progetto, email GitHub, `sviluppo in`, `deploy con`, accessi piattaforme con relative email.
- I filtri attuali sono: testo libero, piattaforma e filtro su email duplicate.
- I badge mostrano quando la stessa email GitHub o la stessa email piattaforma compaiono in piu progetti.
- I valori `sviluppo in` e `deploy con` sono resi come pill solide senza contorno, con palette naturale stabile per i provider gia noti (`Windsurf`, `Replit`, `Render`, `CloudFlare`) e fallback deterministico per eventuali nuovi valori, cosi nuovi record ricevono automaticamente un colore coerente senza alterare quelli gia mappati.
- La Dashboard non modifica i progetti e non introduce nuove tabelle o persistence dedicate.

## Componenti critici

- `CopyButton`: copia valore, non mostra testo o contorno; lo stato copiato e indicato dall'icona check per 1600 ms.
- `FieldGroup`: contenitore standard per gruppi di contenuto.
