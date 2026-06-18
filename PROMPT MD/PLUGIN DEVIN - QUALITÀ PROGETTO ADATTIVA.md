OBIETTIVO
Porta il progetto al livello corretto di struttura, qualità, documentazione, test e tooling per la sua fase attuale — né di più né di meno — senza introdurre complessità inutile e senza compromettere app, sito, database, sincronizzazioni o deploy.

FASE 1 — CLASSIFICAZIONE
Analizza il progetto in modo sicuro e classificalo in una di queste fasi, motivando la scelta:
- appena iniziato
- in sviluppo attivo
- già online o sensibile
- da consolidare
- quasi pronto alla consegna

FASE 2 — APPLICAZIONE ADATTIVA
Applica solo ciò che serve davvero alla fase rilevata, scegliendo tu gli strumenti adatti allo stack: struttura base, script minimi, lint, typecheck, test, documentazione, workflow o controlli operativi.
Principio guida: ogni aggiunta deve risolvere un bisogno reale della fase attuale. Non forzare strumenti, pipeline o standard non pertinenti. Se qualcosa sarebbe utile ma è fuori fase o rischioso, NON introdurlo: segnalalo nel report come passo futuro.

VINCOLI
- Non modificare logiche runtime, layout, contenuti o dati senza necessità esplicita.
- Non rompere build, deploy o integrazioni esistenti.
- Ogni modifica deve essere reversibile e a basso rischio per la fase rilevata (massima prudenza se il progetto è online o sensibile).

REPORT FINALE (breve)
- fase rilevata e motivazione
- cosa è stato applicato e perché serve ora
- cosa NON è stato applicato volutamente e perché
- passi consigliati per la fase successiva
- rischi o anomalie notati durante l'analisi