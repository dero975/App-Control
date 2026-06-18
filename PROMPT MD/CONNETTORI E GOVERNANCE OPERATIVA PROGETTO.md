
Lavora nel progetto corrente. Sei autorizzato a eseguire tutto in autonomia: installazioni CLI/tool (brew, psql, runtime container, SDK), configurazione PATH, generazione secrets (es. SESSION_SECRET), creazione file, aggiornamento documentazione, avvio server locale temporaneo per test. Non fermarti per chiedere conferma su queste operazioni. Fermati SOLO se serve un login interattivo, una password utente di sistema, o un token/API key che non puoi generare.

OBIETTIVO
Analizza il repository, verifica e connetti operativamente tutti i servizi usati dal progetto, installa i tool mancanti, genera i secrets mancanti, e aggiorna la documentazione operativa — così che qualsiasi agent AI possa lavorare sul progetto in futuro senza storico chat.

DEFINIZIONE DI "CONNESSO" (vincolante)
Per ogni servizio devi accertare e dichiarare DUE stati distinti, ciascuno con prova:
- LETTURA = provata solo da una query/metadata/API call read-only realmente eseguita.
- SCRITTURA = provata solo da un'operazione di scrittura che il servizio ha ACCETTATO ed ESEGUITO. Per il database la prova di scrittura è OBBLIGATORIA e va fatta in modalità non persistente (vedi FASE 3). "So che l'app scrive" o "le credenziali lo consentirebbero" NON sono prove: se non hai eseguito la prova, dichiara "scrittura NON verificata".

VINCOLO DI NON PERSISTENZA (sostituisce i divieti generici sul DB)
Non eseguire alcuna scrittura PERSISTENTE su database, dati, schema, policy, deploy, UI o produzione senza richiesta esplicita dell'owner, e mai in forma distruttiva.
ECCEZIONE ESPLICITAMENTE CONSENTITA E RICHIESTA: una prova di scrittura su DB eseguita dentro UNA transazione con ROLLBACK finale (nessun dato/DDL persiste) NON è una modifica persistente: è OBBLIGATORIA e va eseguita in autonomia, senza chiedere conferma.

🆕 SCRITTURA DI SCHEMA — DIVIETO ESPLICITO: non eseguire MAI comandi di sincronizzazione schema diretta contro un DB remoto/produzione (es. `drizzle-kit push`, `prisma db push`, `--force`, sync automatici). Su un DB con dati reali possono droppare colonne/indici senza conferma. Qualsiasi allineamento di schema su produzione si fa a mano, additivo, con backup, e solo su richiesta esplicita dell'owner.

FASE 1 — ANALISI PROGETTO
Rileva: stack, struttura, package manager, script disponibili, dipendenze installate o mancanti, database, servizi esterni, deploy, GitHub/CI, documentazione esistente. Individua i gate/script del progetto per la verifica DB (es. uno script che applica SQL in transazione e fa rollback, e uno read-only).
🆕 Rileva se i test richiedono un RUNTIME CONTAINER: cerca nelle dipendenze e nei config `testcontainers`, `@testcontainers/*`, `docker-compose`, `Dockerfile`. Se presenti, un runtime container sarà necessario in FASE 2/3.
🆕 Rileva la strategia di DEPLOY: presenza di file tipo `render.yaml`, `vercel.json`, `fly.toml`, `Procfile`, GitHub Actions di deploy. Annota in particolare se è configurato AUTODEPLOY su un branch (es. `autoDeploy: true` su main): in tal caso un push su quel branch È un deploy in produzione — trattalo come azione ad alto rischio (vedi GITHUB/CI e RISCHI).

FASE 2 — AMBIENTE LOCALE
- Verifica che le dipendenze del progetto siano installate; se mancano, installale.
- Confronta .env con .env.example: ogni variabile richiesta deve essere presente. Se manca un secret generabile, generalo e aggiungilo. Se manca un secret non generabile, fermati con AZIONE ORA.
- Verifica che la variabile di connessione DB scrivibile (es. DATABASE_URL con utente non-anonimo, o service-role key) sia presente e puntata al progetto corretto. Senza credenziale scrivibile, la prova di scrittura non è possibile: dichiaralo e fermati con AZIONE ORA.
- Verifica che .env sia nel .gitignore; se non lo è, segnalalo.
- Verifica CLI necessari (node, pnpm, git, gh, docker, psql, CLI specifici del progetto). Se un tool manca ma serve, installalo con metodo ufficiale.
🆕 - RUNTIME CONTAINER: se la FASE 1 ha rilevato testcontainers/docker-compose/Dockerfile, verifica che un runtime container risponda (`docker info`). Se non risponde e non è installato, installa un runtime col metodo ufficiale della piattaforma (es. Docker Desktop, oppure un'alternativa leggera da CLI come Colima/Podman) e avvialo. Se il runtime usa un socket non standard (es. Colima espone `~/.colima/.../docker.sock` invece di `/var/run/docker.sock`), configura le variabili che i testcontainers riconoscono (`DOCKER_HOST` e, se serve, `TESTCONTAINERS_DOCKER_SOCKET_OVERRIDE`). Se il runtime non è installabile in autonomia (serve login/licenza), dichiaralo con AZIONE ORA.
- Verifica e configura PATH se necessario.

FASE 3 — VERIFICA E CONNESSIONE SERVIZI
Per ogni servizio: verifica la connessione REALE (non solo dal codice). Non dichiarare "connesso" senza prova, né "non disponibile" senza aver tentato installazione e verifica.

DATABASE (procedura obbligatoria in due passi — entrambi richiesti):
1. PROVA DI LETTURA: esegui il gate read-only del progetto (es. `pnpm run verify:supabase`) o, in assenza, una query metadata/schema read-only. Riporta schema/tabelle/seed minimi.
   - 🆕 ESEGUI dal workspace giusto: in un monorepo il driver DB (es. `pg`) può non essere risolvibile dalla root o dal package applicativo per isolamento del package manager. Lancia la prova dal package che possiede il driver (es. `lib/db`).
   - VINCOLO LETTURA: leggi solo metadata/schema/conteggi e seed; mai contenuti di dati di produzione, mai segreti.
   - 🆕 RILEVA SCHEMA DRIFT: confronta lo schema definito nel CODICE (tabelle, colonne, indici, vincoli) con quello REALE del DB. Segnala ogni divergenza (indici/colonne mancanti, nomi diversi, oggetti presenti nel DB ma non nel codice) come anomalia nei RISCHI — NON correggerla.
2. PROVA DI SCRITTURA (transazionale, non persistente): esegui il gate del progetto che applica SQL in transazione e fa rollback (es. `pnpm run verify:migrations`).
   - Se quel gate non esiste, esegui tu una prova minima esplicita: apri una transazione, esegui una scrittura innocua (es. `CREATE TEMP TABLE _probe(x int); INSERT INTO _probe VALUES (1);`), poi `ROLLBACK`. Mai su tabelle reali, mai un COMMIT.
   - CRITERIO DI SUCCESSO: il comando termina con esito positivo e segnala rollback/nessuna persistenza (es. output `rollbackOnly: true`). Solo allora puoi dichiarare "scrittura VERIFICATA (transazionale, rollback)".
   - CONTROLLO POST-PROVA: ri-esegui il gate read-only e conferma ZERO drift rispetto al passo 1 (nessuna modifica persistita).
   - VINCOLI: mai DROP/DELETE/UPDATE/ALTER persistenti, mai su dati di produzione, mai COMMIT. Se la prova fallisce per permessi, dichiara "scrittura NON disponibile con queste credenziali" e indica quale credenziale serve.

🆕 TEST CONTAINER (solo se rilevati in FASE 1): con il runtime attivo, ESEGUI DAVVERO la suite di integration/E2E test come prova reale. Se passano, dichiaralo con il comando usato. Se non hai potuto eseguirli (runtime mancante/non installabile), dichiara "test container NON eseguibili: manca runtime" — NON dichiarare la suite verde senza averla eseguita.

DEPLOY/HOSTING: verifica stato via API o CLI se accessibile (read-only). Nessun deploy, restart o modifica env senza richiesta.
🆕 - Distingui l'ultimo deploy RIUSCITO (live) dall'ultimo deploy TENTATO. Se gli ultimi tentativi sono FALLITI, la produzione gira su una versione VECCHIA: dichiaralo.
🆕 - ATTENZIONE: "la produzione risponde 200 / health ok" NON prova che l'ultimo commit sia in produzione — potrebbe essere una build precedente. Verifica quale commit è effettivamente live.
🆕 - Se un deploy è fallito, LEGGI I LOG e classifica la causa: build (es. errore compilazione, out-of-memory/heap limit, exit 134), runtime/avvio (porta non aperta, crash, env mancante), oppure healthcheck. Riporta la causa precisa, non solo "fallito".
🆕 - CI ≠ DEPLOY: una CI verde NON garantisce che il deploy passi (il deploy di solito esegue solo il build di produzione, non i test). Sono pipeline indipendenti: verificale entrambe e non dedurre l'una dall'altra.

GITHUB/CI: verifica repo, auth, branch, ultime run CI con causa di eventuali fallimenti. Nessun commit/push/PR (salvo richiesta).
🆕 - Se è attivo l'AUTODEPLOY su un branch (rilevato in FASE 1), avvisa esplicitamente che un push su quel branch farà partire un deploy in produzione. Non pushare su quel branch senza autorizzazione esplicita dell'owner, anche se ti fosse genericamente chiesto di "committare e pushare".
INTEGRAZIONI ESTERNE: verifica esistenza e connessione. Se manca auth, dichiara "presente ma non connessa".

FASE 4 — TEST BROWSER/UI
Se il progetto ha un frontend e Playwright (o tool simile) è disponibile o installabile:
1. Avvia il server in locale temporaneamente.
2. Naviga i flussi principali (pubblico + admin/autenticato).
3. Cattura: screenshot di ogni pagina, errori console JS, errori network, richieste API con status code.
4. Adatta il test all'UI reale (es. tastierino PIN custom, wizard multi-step).
5. Spegni il server e pulisci i file temporanei.

FASE 5 — DOCUMENTAZIONE
Aggiorna il file canonico caricato dagli agent (CLAUDE.md, AGENTS.md o equivalente):
- Stato verificato di ogni connessione con data, distinguendo LETTURA e SCRITTURA con la rispettiva prova (per il DB: comando usato + esito rollback).
- Variabili .env (presenti/mancanti/critiche).
🆕 - Tool/runtime richiesti e come ottenerli (es. runtime container per i testcontainers, con eventuali variabili socket).
- Problemi noti rilevati (CI fallita, deploy fallito con causa, schema drift, config mancanti, warning).
- Decision log aggiornato.
Niente duplicati, niente contenuti generici. Se codice e documentazione divergono, fa fede il codice.

SICUREZZA
- Mai stampare password, token, API key, URL con credenziali o contenuti degli .env.
- Verificare git status prima di modificare file.
🆕 - Prima di QUALSIASI `git add`, esegui `git status` ed escludi esplicitamente i file NON di progetto (lock di tooling, cache, artefatti temporanei, output di sessione). Aggiungi solo i file che hai intenzionalmente modificato.
- Rimuovere file temporanei creati durante le verifiche.
- Non inventare servizi, credenziali o convenzioni.
- Nessuna scrittura DB persistente o distruttiva: la sola scrittura ammessa è transazionale con rollback.

SE SERVE UNA MIA AZIONE (login interattivo, token non generabile, password di sistema, credenziale DB scrivibile mancante, runtime container non installabile in autonomia)
Chiedi una sola azione alla volta:
`AZIONE ORA: <azione concreta>. Poi rispondi "fatto".`

OUTPUT FINALE (schema fisso)
STATO — progetto, stack e stato generale
AMBIENTE — dipendenze, CLI, runtime container, .env: cosa era presente e cosa è stato installato/generato
CONNESSIONI — un rigo per servizio. Per il DB OBBLIGATORIO il formato:
  `Database: LETTURA <provata: comando/esito> | SCRITTURA <verificata transazionale-rollback: comando/esito | oppure NON verificata: motivo>`
CI/WORKFLOW — stato workflow attivi, ultima run, eventuali fallimenti con causa
🆕 DEPLOY — ultimo deploy riuscito vs ultimo tentato; quale commit è live; se fallito, causa precisa (build/runtime/healthcheck)
🆕 TEST CONTAINER — eseguiti sì/no, esito, oppure "non eseguibili: manca runtime"
BROWSER — risultato test UI: pagine testate, screenshot, errori console/network
DOCUMENTAZIONE — file aggiornati
AZIONE RICHIESTA A ME — solo se serve, altrimenti "nessuna"
PROSSIMO STEP — cosa fare dopo
RISCHI — note operative (incl. autodeploy attivo, schema drift, produzione su versione vecchia)
