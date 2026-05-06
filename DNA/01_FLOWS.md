# 01 - Flows

Documenta solo i flussi che riducono rischio operativo. Per dettagli di rendering, leggere i componenti.

## Navigazione

- `App` tiene in stato la sezione attiva.
- Prima della shell, `App` mostra `PinLockPage` se `sessionStorage` non contiene lo sblocco app.
- PIN valido: 6 cifre, default DB `140478`; il PIN viene salvato come hash in Supabase.
- Dopo PIN corretto, lo sblocco resta valido fino a chiusura browser o comando `Esci`.
- `AppLayout` rende sidebar desktop, select mobile e contenuto principale.
- `navigation.ts` definisce le tre sezioni: `projects`, `prompts`, `settings`.

## Progetti

Fonte principale: `src/features/projects/ProjectsPage.tsx`.

- Se Supabase e configurato, la sezione Progetti usa il client anon dopo sblocco PIN.
- Vista principale con lista progetti a sinistra e dettaglio a destra.
- `Nuovo progetto` crea un progetto in Supabase con campi vuoti, `agent_project_id`, Agent Key nel formato `XXXXX-XXXXX-XXXXX-XXXXX`, hash chiave e prompt sync generico.
- `Elimina progetto` apre una modale di conferma e rimuove il progetto da Supabase; le tabelle figlie vengono rimosse via cascade.
- `Salva modifiche` persiste su Supabase dati progetto, accessi piattaforme e variabili ENV del progetto selezionato.
- Selezionando un progetto si torna sempre al tab `Dati progetto`.
- Tab interni: `Dati progetto`, `Variabili`, `Immagini`, `Note`.
- `Dati progetto` usa `buildSheetFields(project)` e presenta righe editabili; il salvataggio scrive core fields, campi custom e accessi piattaforme.
- `Variabili` usa `buildProjectVariables(project)` e ordina variabili tecniche con `orderedProjectKeys`; il salvataggio scrive `project_env_variables`.
- `Immagini` mostra gli asset visivi collegati al progetto senza blocco cartelle e senza pulsanti copia path.
- `Note` mostra `operationalNotes` in textarea read-only.
- `Agent sync` espone prima il prompt generico stabile in blocco statico non modificabile e poi il JSON `.agent/app-control.json` specifico del progetto; non duplica Project ID o Agent Key in card separate.
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

- Il tab `Immagini` mostra sempre cinque slot fissi: `logo app`, `logo app 2`, `logo app 3`, `Icona Schermata Home`, `Icona Tab Browser (favicon)`.
- Ogni slot consente inserimento file immagine locale tramite pulsante o drag and drop, anteprima, scaricamento del file inserito e rimozione del file dalla sessione.
- Le immagini raster vengono ottimizzate client-side prima del salvataggio in sessione: limite massimo target 500 KB, lato maggiore massimo 1200 px, output WebP quando serve comprimere. SVG resta invariato.
- Il download usa sempre il titolo della card come nome file, mantenendo l'estensione coerente con il formato salvato.
- La cartella di destinazione download e quella predefinita del browser/PC; la web app non forza path locali arbitrari.
- Le card restano visibili anche se non viene inserita nessuna immagine.
- Se un nome contiene una nota tra parentesi, la nota e renderizzata come testo secondario non bold.

## Variabili ENV

Fonte: `src/features/projects/EnvForm.tsx`.

- Genera blocco ENV completo con `formatEnvBlock`.
- Genera blocco Render escludendo `SUPABASE_SERVICE_ROLE_KEY`.
- Usa `SensitiveField` per variabili marcate sensibili.
- La copia avviene tramite `CopyButton`; non loggare valori.

## Prompt

Fonte: `src/features/prompts`.

- Ricerca su titolo, tag e testo completo.
- Filtri per tipo e categoria.
- Lista a card, dettaglio laterale, copia testo completo.
- Il pulsante `Modifica` e presente come UI, ma non implementa ancora editing reale.

## Impostazioni

Fonte: `src/features/settings/SettingsPage.tsx`.

- Card `Modifica PIN`: richiede PIN attuale, nuovo PIN e conferma; aggiorna l'hash in Supabase.
- Card `Sessione`: consente di uscire dall'app cancellando lo sblocco in `sessionStorage`.

## Componenti critici

- `CopyButton`: copia valore, non mostra testo o contorno; lo stato copiato e indicato dall'icona check per 1600 ms.
- `SensitiveField`: maschera solo quando `sensitive` e true; copia sempre il valore reale.
- `FieldGroup`: contenitore standard per gruppi di contenuto.
