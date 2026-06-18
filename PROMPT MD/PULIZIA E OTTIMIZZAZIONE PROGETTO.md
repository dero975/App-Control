Lavora nel progetto corrente con approccio sicuro ed enterprise.

MODALITÀ
Questo prompt ha due modalità. Se non specifico nulla, vale la ORDINARIA.
- ORDINARIA (default): manutenzione sicura e non invasiva. Esegui solo interventi di categoria A; il resto si segnala.
- PROFONDA (solo se scrivo "MODALITÀ PROFONDA"): bonifica completa con eliminazioni reali, secondo le regole aggiuntive in fondo.

OBIETTIVO
Progetto pulito, stabile, coerente, leggero, manutenibile e performante su desktop, mobile e dispositivi poco potenti.
Non modificare logiche di business, runtime, layout, UX, contenuti, database, sincronizzazioni, deploy o comportamento pubblico dell'app senza richiesta esplicita.

FASE 1 — ANALISI
Analizza il progetto reale: struttura cartelle e file, codice, configurazioni, dipendenze, script, routing, build, deploy, documentazione `.md`, asset (immagini, icone, font), log e file temporanei, integrazioni esterne, eventuale database (es. Supabase) solo in lettura sicura.
Individua: errori, conflitti, logiche doppie, codice sporco o ridondante, file e cartelle doppi o obsoleti, file troppo lunghi, asset pesanti, rendering inutili, dipendenze inutili o ridondanti, colli di bottiglia, rischi operativi.

FASE 2 — CLASSIFICAZIONE
Prima di toccare qualsiasi cosa, classifica ogni intervento in:
A. sicuro, eseguibile subito
B. utile ma da fare per step
C. rischioso, da non eseguire senza conferma
D. dubbio, da lasciare invariato

FASE 3 — ESECUZIONE
Regole di eliminazione (valide in entrambe le modalità):
- Rimuovi solo file o codice inutilizzati al 100%, con prova tecnica concreta: assenza di import statici e dinamici, riferimenti testuali, riferimenti in config, route, build, deploy, CSS, HTML, manifest e utilizzi dinamici.
- Nel dubbio, non eliminare. Mai eliminare per supposizione: asset pubblici, configurazioni, file SEO/PWA, file DB, migration, seed, sync, deploy, documentazione canonica, file legali.
- Nessun fix automatico distruttivo.
In ORDINARIA: esegui solo categoria A (file temporanei certi, log non operativi, piccole semplificazioni documentate, correzioni innocue di documentazione). Asset pesanti, file lunghi e dipendenze sospette vanno SEGNALATI, non risolti.
Se un intervento può alterare il comportamento, fermati e riportalo nel report.

FASE 4 — VERIFICA
Dopo ogni modifica esegui i controlli disponibili: typecheck, lint, build, test, smoke test, navigazione base, altri previsti dal progetto. Se un controllo fallisce, fermati e spiega.

REGOLE AGGIUNTIVE — SOLO MODALITÀ PROFONDA
Precondizioni obbligatorie, altrimenti fermati:
- `git status` pulito; lavora su un branch dedicato alla bonifica
- esegui i controlli PRIMA di iniziare e salva l'esito come baseline; se la baseline già fallisce, fermati
Esecuzione estesa:
- esegui anche le categorie A e B: eliminazione di tutto ciò che è PROVATO inutilizzato (file, cartelle, componenti, route, asset, export morti, codice commentato, residui di debug), rimozione dipendenze non usate o ridondanti, unificazione delle logiche doppie nella versione migliore con prova di comportamento invariato
- procedi per lotti piccoli e omogenei; dopo OGNI lotto riesegui la baseline: se si rompe, ripristina il lotto e sposta in DUBBIO
- un commit per lotto sul branch di bonifica, con messaggio che elenca rimozioni e prove
- chiudi con: tutti i controlli passano come la baseline o meglio, avvio reale dell'app con verifica di navigazione e flussi principali, confronto prima/dopo (file, dimensione repo, dipendenze, build)
- nessun merge e nessun push senza mia conferma esplicita

SICUREZZA
- Nessuna scrittura su database, nessuna sync esterna reale, nessuna email reale.
- Nessuna modifica a produzione, UI o comportamento pubblico.
- Mai stampare segreti, token o chiavi; mai toccare `.env`.
- In ORDINARIA: nessun commit/push salvo richiesta esplicita; prima di modificare file, controlla `git status`.

DOCUMENTAZIONE
Aggiorna `.md` solo se necessario, documentando solo modifiche reali o rischi importanti. Niente doppioni o testo generico.

REPORT FINALE (breve, schema fisso)
MODALITÀ — ordinaria o profonda
STATO GENERALE — valutazione complessiva
PROBLEMI TROVATI — problemi reali individuati
INTERVENTI APPLICATI — modifiche eseguite
INTERVENTI NON APPLICATI — categorie non eseguite con motivazione
ELIMINAZIONI — cosa è stato eliminato, con prova tecnica dell'inutilizzo
UNIFICAZIONI — logiche doppie risolte (solo profonda)
ELEMENTI DUBBI — cosa è stato lasciato invariato e perché
SEGNALAZIONI — file troppo lunghi, asset pesanti, dipendenze sospette
PRIMA/DOPO — file, dimensione repo, dipendenze, build (solo profonda)
VERIFICHE ESEGUITE — controlli e risultati
DATABASE — stato, solo se verificato read-only
DOCUMENTAZIONE — file `.md` aggiornati
GIT — stato finale; branch di bonifica se profonda; conferma nessun push
RISCHI RESIDUI — note operative
PROSSIMO STEP — una sola azione sicura successiva


