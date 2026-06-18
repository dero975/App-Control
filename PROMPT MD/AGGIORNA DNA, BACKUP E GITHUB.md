Lavora nel progetto corrente eseguendo solo attività sicure e non distruttive.

OBIETTIVO
Chiusura rapida e in stato enterprise di una sessione di lavoro: allinea documentazione e DB a ciò che è cambiato, crea backup locale e versiona su GitHub solo se tutto è verificato e sicuro.

MODALITÀ INCREMENTALE (regola di velocità)
Questo è il prompt di routine, non l'intervento profondo (per quello esiste un prompt separato).
- Lavora per DELTA: parti da `git status` e `git diff` per individuare cosa è cambiato dall'ultimo commit, e limita analisi e aggiornamenti alle aree toccate.
- NON rianalizzare l'intero progetto, NON ristrutturare `DNA/`, NON riconsolidare documentazione già allineata.
- Eccezione: se rilevi che `DNA/` è gravemente disallineato o degradato, NON sistemarlo qui — segnala nel report che serve il prompt di riallineamento profondo.

FASE 1 — ANALISI DELTA
1. Controlla Git: status, diff, branch corrente, remote GitHub.
2. Identifica le aree toccate dalle modifiche: codice, schema/migrazioni DB, configurazioni, documentazione.
3. Solo se le modifiche toccano il database: verifica la coerenza tra codice e DB reale (es. Supabase) limitatamente alle parti coinvolte.

FASE 2 — ALLINEAMENTO (solo aree toccate)
- In caso di conflitto tra documentazione e codice, fa fede il codice.
- Disallineamento codice/DB nelle aree toccate: documentalo; se la correzione è sicura e versionabile, prepara o aggiorna migrazioni/script coerenti col progetto; se non è sicura, fermati e spiega cosa serve prima. Non inventare soluzioni.
- Aggiorna SOLO i file `.md` impattati dalle modifiche, con sole informazioni operative utili. Il DNA non deve crescere ad ogni sessione: aggiorna righe esistenti invece di aggiungere sezioni, niente testo generico o duplicato.
- Verifica la presenza dei file `.env` operativi necessari.

FASE 3 — BACKUP
- Crea un backup locale nella cartella `BACKUP` nella root (creala se non esiste).
- Un solo file compresso, non una cartella, nome nel formato esatto `Backup_Giorno Mese_HH.MM` (es. `Backup_18 Maggio_01.18`), senza estensione aggiunta.
- Includi i file utili al ripristino operativo, compresi gli `.env` locali se presenti e necessari.
- Escludi sempre: `node_modules`, `.git`, cartelle di build/dist, cache, coverage, log inutili, vecchi backup e la cartella `BACKUP` stessa.
- Il backup non va mai committato.

FASE 4 — CONTROLLI, COMMIT E PUSH
- Esegui i controlli disponibili del progetto (lint, type-check, test, build — ciò che esiste).
- Prima del commit ricontrolla `git status`, branch e remote.
- Non committare: `.env`, backup, cache, file generati, file ambigui o non pertinenti.
- Commit solo se i controlli passano. Push solo se il remote GitHub è certo e autorizzato.
- Se GitHub richiede autorizzazione da terminale, fermati e mostra il codice operativo a 8 caratteri.

VINCOLI DI SICUREZZA
- Nessuna modifica distruttiva al database: non cancellare tabelle, colonne, dati, bucket o policy.
- Le modifiche allo schema vanno proposte solo come migrazioni versionate.
- Non esporre mai chiavi, password, URL privati o contenuti degli `.env`.
- In caso di dubbio su qualsiasi operazione, fermati e chiedi.

REPORT FINALE (breve)
- Modifiche rilevate (delta) e aree toccate
- Stato allineamento codice / DB / documentazione nelle aree toccate
- File `.md` aggiornati
- Nome esatto del backup creato e conferma che è un singolo file compresso
- Controlli eseguiti e risultato
- Commit e push: eseguiti oppure motivo esatto dello stop
- Eventuale segnalazione: "serve riallineamento profondo DNA" (sì/no)


al termine avvia sempre app in local 5001