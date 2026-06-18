AVVIO SESSIONE — ALLINEAMENTO COMPLETO PROGETTO

Stai aprendo questo progetto per la prima volta su questo dispositivo, senza storico chat. Obiettivo: metterti rapidamente in linea con il progetto a 360 gradi, in sola lettura, così da poter lavorare da subito in modo sicuro e coerente.

Questo è un allineamento, non un audit: leggi, verifica e riassumi. Nessuna modifica a codice, file, configurazioni, database o Git.

FASE 1 — CONTESTO CANONICO
- Leggi per prima la documentazione operativa canonica: il file regole caricato automaticamente dal tuo ambiente (es. `AGENTS.md`, `CLAUDE.md` o equivalente nativo), la cartella `DNA/` partendo dal suo indice, la governance e ogni documento di regole permanenti presente.
- Assimila: regole di governance, vincoli non negoziabili, checklist pre/post modifica, decisioni architetturali, procedure operative e automatismi che ti OBBLIGANO a determinate azioni o analisi prima di intervenire (inclusa l'eventuale regola di selezione livello reasoning, se applicabile al tuo ambiente). Da questo momento li rispetti.

FASE 2 — PROGETTO REALE
- Rileva stack, struttura, entrypoint, script disponibili, package manager, configurazioni, routing, build e deploy.
- Verifica lo stato Git: branch corrente, remote, eventuali modifiche non committate.
- Verifica la presenza dei file `.env` necessari (senza stampare contenuti).

FASE 3 — CONNESSIONI E SERVIZI
- Identifica i servizi realmente usati: database (es. Supabase), deploy/hosting, GitHub/CI, integrazioni esterne, sincronizzazioni, backup, scheduler.
- Per ciascuno verifica rapidamente se la connessione è operativa da questo dispositivo (connettore, CLI, auth) con soli controlli read-only e sicuri. Non dichiarare "connesso" senza verifica reale.
- Se il database è accessibile, leggi solo metadata/schema per confermare l'allineamento col codice. Mai dati di produzione, mai segreti.

FASE 4 — COERENZA
- Confronta documentazione canonica e stato reale: se divergono, fa fede il codice — segnala la divergenza, non correggerla ora.
- Segnala automatismi o workflow attivi di cui devo essere consapevole (CI, sync, job schedulati).

OUTPUT FINALE (breve, schema fisso)
PROGETTO — cos'è, stack, stato attuale in 3-5 righe
REGOLE ATTIVE — governance e vincoli che applicherai da ora
CONNESSIONI — un rigo per servizio: operativa / da configurare su questo device / non verificabile
AUTOMATISMI — workflow, sync e obblighi operativi attivi
DIVERGENZE — disallineamenti tra documentazione, codice e DB
GAP SU QUESTO DEVICE — cosa manca per essere pienamente operativi (login CLI, tool, env)
AZIONE RICHIESTA A ME — una sola, solo se indispensabile, formato: `AZIONE ORA: <azione>. Poi rispondi "fatto".`
PRONTO — conferma che sei allineato e in attesa della prima richiesta operativa

al termine avvia sempre appp in local 5001