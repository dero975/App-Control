# 01 - Flows

Documenta solo i flussi che riducono rischio operativo. Per dettagli di rendering, leggere i componenti.

## Navigazione

- `App` tiene in stato la sezione attiva.
- A ogni avvio/mount dell'app, `App` mostra `IntroSplash` per 5 secondi prima della shell o del PIN. Sfondo intro stabile; solo logo e testo `by Dero` fanno fade in/out per 4.5 secondi, poi resta 0.5 secondi prima del passaggio.
- Prima della shell, `App` mostra `PinLockPage` se `sessionStorage` non contiene lo sblocco app.
- PIN valido: 6 cifre, default DB `140478`; il PIN viene salvato come hash in Supabase.
- Dopo PIN corretto, lo sblocco resta valido fino a chiusura browser o comando `Esci`.
- `AppLayout` rende sidebar desktop, select mobile e contenuto principale.
- Su desktop la sidebar e la pagina `Progetti` restano bloccate nel viewport; scorrono solo lista progetti e liste card interne dei tab quando necessario.
- `navigation.ts` definisce le tre sezioni: `projects`, `prompts`, `settings`.

## Progetti

Fonte principale: `src/features/projects/ProjectsPage.tsx`.

- Se Supabase e configurato, la sezione Progetti usa il client anon dopo sblocco PIN.
- Vista principale con lista progetti a sinistra e dettaglio a destra.
- La lista progetti supporta ricerca locale, ordinamento alfabetico bidirezionale e ordinamento recente/meno recente; ogni card mostra anche `Ultima modifica` su una sola riga.
- `Nuovo progetto` crea un progetto in Supabase con campi vuoti, `agent_project_id`, Agent Key nel formato `XXXXX-XXXXX-XXXXX-XXXXX`, hash chiave e prompt sync generico.
- `Elimina progetto` apre una modale di conferma e rimuove il progetto da Supabase; le tabelle figlie vengono rimosse via cascade.
- Le modifiche al dettaglio progetto vengono salvate automaticamente su Supabase con debounce breve; non esiste pulsante manuale `Salva modifiche`.
- Selezionando un progetto si torna sempre al tab `Dati progetto`.
- Tab interni: `Dati progetto`, `Variabili`, `Immagini`, `Note`, `Sync`.
- L'header dettaglio mostra titolo progetto, link deploy se presente e `Data creazione` formattata sotto al link.
- `Dati progetto` usa `buildSheetFields(project)` e presenta righe editabili; il salvataggio scrive core fields, campi custom e accessi piattaforme.
- `Variabili` usa `buildProjectVariables(project)` e ordina variabili tecniche con `orderedProjectKeys`; il salvataggio scrive `project_env_variables`.
- `Immagini` mostra gli asset visivi collegati al progetto senza blocco cartelle e senza pulsanti copia path.
- `Note` espone `operationalNotes` in textarea editabile locale; il valore entra nello snapshot di autosave del dettaglio progetto.
- `Sync` contiene il blocco `Agent sync`: espone prima il prompt generico stabile in blocco statico non modificabile e poi il JSON `.agent/app-control.json` specifico del progetto; non duplica Project ID o Agent Key in card separate.
- Il prompt di sincronizzazione non deve essere rigenerato per ogni progetto: identifica il flusso. Il JSON cambia per progetto e contiene `projectId` e `agentKey`.
- In `Agent sync`, le icone copia stanno dentro al box relativo e non hanno testo o contorno.
- Nella lista progetti la preview mostra solo `sviluppo in / deploy con`; non mostra stato o conteggio immagini.
- Le icone cestino delle card editabili devono restare allineate alla riga del controllo bianco, anche quando la card contiene contenuti extra sotto.

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

Fonte: `src/features/projects/ProjectsPage.tsx`.

- Il pulsante `.env render` nel tab `Variabili` copia un preset generale per deploy Render di altri progetti.
- Il blocco include sempre le chiavi standard, anche se vuote: `SUPABASE_URL`, `VITE_SUPABASE_URL`, `SUPABASE_ANON_KEY`, `VITE_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `SUPABASE_DB_URL`, `DATABASE_URL`, `GITHUB_URL`, `GITHUB_TOKEN`.
- `SUPABASE_URL` e `VITE_SUPABASE_URL` vengono normalizzate senza suffisso `/rest/v1`.
- Il blocco puo contenere segreti: non stamparlo in log o documentazione.

## Prompt

Fonte: `src/features/prompts`.

- La pagina `Prompt` e una libreria essenziale di card operative.
- Le sole categorie canoniche attuali sono `Prompt iniziali` e `Prompt manutenzione`.
- Ogni card mostra solo il titolo; la categoria resta come filtro della pagina e non viene ripetuta nel corpo della card. Il testo completo del prompt si visualizza solo quando la card viene aperta con click.
- Il pulsante copia e sempre disponibile sia a card chiusa sia a card aperta.
- Non esistono piu pannello dettaglio laterale, tag, note d'uso, preferiti, data ultima modifica o pulsante `Modifica`.

## Impostazioni

Fonte: `src/features/settings/SettingsPage.tsx`.

- La pagina `Impostazioni` gestisce solo il cambio PIN.
- `Modifica PIN`: richiede PIN attuale, nuovo PIN e conferma; aggiorna l'hash in Supabase.
- Il logout non e piu duplicato nella pagina `Impostazioni`: resta solo nella navigazione dell'app.

## Componenti critici

- `CopyButton`: copia valore, non mostra testo o contorno; lo stato copiato e indicato dall'icona check per 1600 ms.
- `FieldGroup`: contenitore standard per gruppi di contenuto.
