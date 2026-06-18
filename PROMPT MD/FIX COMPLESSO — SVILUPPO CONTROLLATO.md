Lavora nel progetto corrente. Sotto questo prompt trovi la descrizione della funzionalità o del problema da risolvere: sviluppala seguendo rigorosamente il flusso qui sotto, nel rispetto della governance e della documentazione canonica (`DNA/`) del progetto.

MODALITÀ PIANO
Default: dopo la Fase 2 ti FERMI e aspetti il mio ok sul piano prima di scrivere codice.
Se nella richiesta scrivo "PROCEDI SENZA CONFERMA": mostri il piano e prosegui da solo, fermandoti solo se il piano tocca database, secrets, deploy o architettura.

FASE 1 — COMPRENSIONE
- Riformula con parole tue: cosa ti ho chiesto, qual è il risultato atteso per l'utente finale, cosa NON è incluso nella richiesta.
- Se la richiesta è un BUG: prima di qualsiasi piano, riproduci il problema in modo affidabile e documenta i passi. Poi isola la CAUSA RADICE, non il sintomo: spiega perché il bug si verifica, dove nasce davvero e perché la tua correzione lo elimina alla fonte. Se non riesci a riprodurlo, fermati e dimmi cosa ti serve.
- Se ci sono ambiguità sostanziali (non di dettaglio), fammi al massimo 3 domande in un unico messaggio. Altrimenti procedi.

FASE 2 — PIANO
Prima di scrivere qualsiasi codice, presenta un piano sintetico:
- file da creare o modificare, e perché
- impatto su DB, API, flussi esistenti, altre aree dell'app
- logiche esistenti che riuserai invece di duplicare
- rischi e come li mitighi
- come verificherai che funziona
- cosa esplicitamente NON toccherai

FASE 3 — IMPLEMENTAZIONE
- Minimo codice necessario per il risultato richiesto: niente extra "già che ci sono", niente refactor non previsti dal piano.
- Riusa componenti, stili e logiche esistenti; segui le convenzioni del progetto.
- Non toccare aree non dichiarate nel piano. Se in corso d'opera scopri che serve toccarne altre, fermati, aggiorna il piano e dimmelo.
- Eventuali modifiche allo schema DB solo come migrazioni versionate, mai distruttive, e solo se previste dal piano approvato.

FASE 4 — VERIFICA
- Esegui i controlli disponibili del progetto (typecheck, lint, build, test).
- Prova realmente la feature o il fix: il flusso completo funziona come richiesto, anche su viewport mobile se rilevante. Per i bug: riesegui i passi di riproduzione e conferma che il problema non si presenta più.
- Verifica di non aver rotto nulla: le funzionalità adiacenti e i flussi principali esistenti funzionano come prima.
- Se qualcosa fallisce, correggi e riverifica prima di chiudere.

FASE 5 — CHIUSURA
- Aggiorna `DNA/` e la documentazione SOLO se la modifica incide su architettura, flussi, API o DB — aggiornamento incrementale, niente nuovi file se basta una riga in qu