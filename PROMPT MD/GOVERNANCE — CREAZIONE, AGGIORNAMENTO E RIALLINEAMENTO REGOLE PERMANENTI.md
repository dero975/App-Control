
OBIETTIVO
Integra nel progetto una governance permanente, adattiva e riutilizzabile: regole operative che ogni futura sessione di qualsiasi agent AI di sviluppo legga e applichi automaticamente, senza doverle ribadire ad ogni sessione, anche cambiando dispositivo, chat, agent o ambiente.
Collocala dove l'agent in uso la carica automaticamente (es. `AGENTS.md`, `CLAUDE.md` o equivalente nativo). Se il progetto può essere lavorato da più agent, garantisci un file canonico unico richiamato dagli altri, mai copie divergenti.
Se esiste già una governance, non duplicarla: verificala, integra le parti mancanti e riallinea quelle obsolete, preservando le regole valide.

DISTINZIONE GOVERNANCE vs DNA
La governance contiene le REGOLE (come si lavora). Lo stato operativo (architettura, servizi, deploy) appartiene a `DNA/`: non duplicare contenuti tra le due. Il file governance deve contenere l'istruzione esplicita di leggere `DNA/` prima di operare.

ENFORCEMENT — REGOLA CRITICA
Le regole nella governance NON sono suggerimenti. Sono vincoli obbligatori. L'agent che le viola sta producendo debito tecnico che un altro operatore dovrà correggere. In particolare:
- Se una regola dice "file sotto le 300 righe", ogni file creato o modificato DEVE rispettare quel limite al momento della scrittura, non "dopo". Se il file che stai scrivendo supera il limite, FERMATI e dividilo prima di continuare.
- Se una regola dice "non duplicare logiche esistenti", CERCA PRIMA se la logica esiste già. Non scrivere codice nuovo senza aver verificato.
- Se una regola dice "aggiornare la documentazione", fallo NELLO STESSO intervento, non in un commit successivo.
- Se scopri di aver violato una regola durante l'esecuzione, CORREGGI SUBITO prima di proseguire. Non segnalare la violazione nel report come "da fare dopo" — risolvila ora.

L'agent deve trattare la governance come un pre-commit hook mentale: ogni azione viene confrontata con le regole PRIMA di essere eseguita, non dopo.

REGOLE PERMANENTI DA INTEGRARE
La governance deve garantire nel tempo:
1. qualità, modularità e scalabilità del codice
2. file piccoli e leggibili (limite esplicito in righe), con separazione chiara delle responsabilità — applicato in fase di scrittura, non come pulizia successiva
3. performance e fluidità dell'applicazione
4. prevenzione di refactor inutili o rischiosi e di duplicazioni logiche
5. gestione ordinata di variabili ambiente, secrets e configurazioni
6. sincronizzazione tra frontend, backend, database, deploy e servizi esterni
7. documentazione tecnica costantemente aggiornata e tracciamento delle decisioni importanti
8. gestione backup e controllo dello stato Git prima e dopo ogni intervento
9. portabilità del progetto
10. selezione corretta del livello di reasoning (regola dedicata sotto)
11. flusso controllato per ogni modifica al codice (regola dedicata sotto)

REGOLA LIVELLO REASONING (da integrare testualmente)
---
## Selezione Livello Reasoning
Questa regola si applica solo se l'ambiente prevede livelli di reasoning selezionabili dall'utente (es. Low/Medium/High/Extra High in Codex/Devin). In ambienti senza selettore, ignora la parte di richiesta upgrade e applica solo la triage: se il task è ad alto rischio, dichiaralo prima di iniziare e procedi con cautela rafforzata.

Prima di eseguire una richiesta, fai una triage rapida della complessità usando solo il prompt e il contesto già disponibile. Non analizzare il progetto solo per decidere il livello. Assumi Medium come livello operativo normale.

Procedi direttamente con Medium se il task è:
- domanda, analisi breve o controllo read-only
- fix puntuale/localizzato a pochi file
- modifica documentale o configurazione semplice
- backup, verifica, commit/push di routine già governati
- UI/content change circoscritto senza DB, sicurezza o architettura

Fermati prima di iniziare e scrivi esattamente:
"⬆️ SELEZIONA HIGH O EXTRA HIGH E RILANCIA — motivo: <una riga>"

Richiedi HIGH se il task include:
- refactor multi-file o modifica architetturale non banale
- debugging che attraversa almeno due layer tra frontend, backend, API, DB
- performance/navigation audit ampio
- pulizia o bonifica ampia con molte eliminazioni
- modifiche a governance, workflow operativi o automazioni con impatto permanente

Richiedi EXTRA HIGH se il task include:
- schema database, migrazioni, hardening DB o policy RLS
- sicurezza/auth/permessi con impatto ampio
- deploy/produzione/incident recovery
- eliminazioni massive difficili da annullare
- decisioni architetturali permanenti ad alto impatto
- operazioni dove un errore può causare perdita dati, downtime o esposizione di segreti

Regole accessorie:
- se il prompt è ambiguo ma il rischio potenziale è alto, chiedi upgrade; se il dubbio è solo sulla dimensione del lavoro ma il rischio è basso e reversibile, procedi
- se DURANTE l'esecuzione scopri che il task è più complesso di quanto stimato nella triage (più file, più layer o più rischio del previsto), fermati a quel punto, salva lo stato senza lasciare lavoro a metà applicato, e chiedi l'upgrade prima di continuare
- se l'owner scrive "PROCEDI COMUNQUE", esegui con il livello attuale, rispettando comunque tutte le regole superiori di sicurezza, DB, Git, privacy e non distruttività
---

REGOLA FLUSSO MODIFICHE (da integrare testualmente)
---
## Flusso Controllato per Ogni Modifica al Codice
Per QUALSIASI richiesta che comporta modifiche al codice (feature, fix, cambiamento), segui sempre questo flusso minimo:
1. COMPRENSIONE — riformula in 1-3 righe cosa è stato chiesto e cosa NON è incluso. Se la richiesta è ambigua su punti sostanziali, fai al massimo 2 domande; altrimenti procedi.
2. PIANO — prima di scrivere codice, dichiara in poche righe: file da toccare, eventuale impatto su DB/API/flussi, rischi. Poi procedi senza attendere conferma, salvo che il piano tocchi aree che richiedono autorizzazione esplicita (DB, secrets, deploy, architettura): in quel caso fermati e chiedi.
3. IMPLEMENTAZIONE — minimo codice necessario, riusa logiche esistenti, non toccare aree non coinvolte. DURANTE la scrittura, verifica che ogni file rispetti i limiti di governance (dimensione, modularità, naming). Se un file supera il limite, dividilo subito.
4. VERIFICA — esegui i controlli disponibili e accerta che le funzionalità esistenti non si siano rotte.
5. CHIUSURA — aggiorna la documentazione solo se la modifica incide su architettura, flussi, API o DB; chiudi con un report breve.
Per task banali (una riga, un typo, un testo) i punti 1-2 possono ridursi a una sola frase, ma mai saltati del tutto.
---

VINCOLI OPERATIVI PERMANENTI
Ogni intervento tecnico futuro deve rispettare:
- file sotto il limite di righe stabilito nella governance: se un file che stai creando o modificando lo supera, dividilo PRIMA di proseguire
- non duplicare logiche esistenti: cerca sempre prima se esiste già
- non toccare aree non coinvolte dalla richiesta
- nessun refactor massivo senza necessità documentata
- nessuna modifica a UX, layout, comportamento o architettura se non richiesta
- nessuna alterazione di database, secrets, deploy o configurazioni sensibili senza autorizzazione esplicita
- il database è l'UNICA fonte di verità dei dati: nessun dato applicativo hardcoded, mock o locale nel codice se appartiene al DB; i dati di esempio sono ammessi solo nei seed/test, mai nel runtime
- parità admin/user obbligatoria quando esiste un'area admin: ogni contenuto gestibile da admin deve essere letto dal lato user dalla stessa fonte DB
- prima di implementare: analizzare lo stato reale del repository
- dopo ogni intervento: aggiornare la documentazione se la modifica incide su architettura, flussi, API, database, deploy, secrets o governance — nello stesso intervento, non dopo
- ogni modifica deve essere verificabile, reversibile e tracciabile
- ogni decisione tecnica rilevante va documentata

CONTENUTI MINIMI DELLA GOVERNANCE
- regole permanenti e standard (codice, dimensione file, ambiente/secrets, database, deploy)
- sezione ENFORCEMENT con istruzioni esplicite su come l'agent deve applicare le regole in tempo reale
- regola di selezione livello reasoning
- regola flusso controllato modifiche
- decision log
- handoff operativo per sessioni future
- checklist pre-modifica e post-modifica
- criteri chiari su: cosa controllare prima di modificare, quali limiti non superare, quando fermarsi e segnalare rischio, quando aggiornare la documentazione, quando NON intervenire

VINCOLI DI QUESTA SESSIONE
Non sviluppare feature applicative: esegui solo l'integrazione o il riallineamento della governance. Scrivi cosa il progetto deve garantire nel tempo, non soluzioni rigide inutilmente vincolanti.

REPORT FINALE (sintetico)
- file creati o modificati
- regole principali integrate o riallineate
- conferma sezione ENFORCEMENT presente e operativa
- conferma che il file caricato automaticamente contiene o richiama tutte le regole e l'istruzione di leggere DNA/
- rischi rilevati e punti che richiedono conferma umana
- conferma che la governance è leggibile e applicabile automaticamente dalle sessioni future.

memeorizza e automaztiiza la governance in modo che sia sempre rispettata dagli agent. anche in nuove chat senza storico
