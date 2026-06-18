OBIETTIVO
Evita che il progetto Supabase su piano Free venga sospeso per inattività, mantenendolo attivo con il minimo intervento possibile e senza mai pesare sui limiti dell'account.

VINCOLO ACCOUNT SUPABASE FREE
Uso SEMPRE Supabase con account Free: il progetto non deve mai superare o saturare i limiti del piano.
- Prima di implementare, verifica i limiti attuali del piano Free dalla documentazione ufficiale Supabase (possono cambiare). Riferimenti attuali: ~500 MB database, ~5 GB egress/mese, limiti su edge functions, realtime e numero di progetti attivi; pausa automatica dopo ~7 giorni di inattività.
- Il keepalive stesso deve avere consumo trascurabile: lettura minima, payload minimo, frequenza minima sufficiente (la pausa scatta dopo 7 giorni: un ping ogni 1-3 giorni basta, non serve oraria).
- Verifica setup e allineamento del DB rispetto ai limiti: dimensione attuale del database, egress recente se rilevabile, tabelle o pattern che rischiano di saturare il piano. Segnala nel report qualsiasi rischio di avvicinamento ai limiti.
- Non introdurre nulla (log, tabelle di ping che crescono, realtime, job) che accumuli dati o consumi risorse nel tempo.

VERIFICA PRELIMINARE
Se il progetto non usa Supabase, non è su piano Free o ha già un sistema di keepalive funzionante (verificalo davvero, non solo nel codice): fermati e dichiaralo esplicitamente.

PREREQUISITI E CATENA OPERATIVA
Il keepalive funziona solo se l'intera catena è operativa. Verifica end-to-end:
- lo scheduler scelto è realmente attivo e raggiungibile (es. se GitHub Actions: repo remoto certo, Actions abilitate, secret configurabili)
- la chiave a privilegio minimo è disponibile dove serve (secret dello scheduler, mai nel repo)
- la lettura di ping ha una policy che la consente (se RLS blocca tutto, crea una tabella o endpoint dedicato al ping, innocuo e vuoto)
- se usi GitHub Actions, mitiga la disattivazione automatica dei workflow schedulati dopo 60 giorni di inattività del repo (scegli tu il metodo) e documenta il rischio residuo
- REGOLA: per QUALSIASI passaggio della catena che non puoi completare tu (secret, login, abilitazioni, permessi), fermati e dimmelo in modo chiaro e sintetico con una sola azione alla volta, nel formato esatto: `AZIONE ORA: <azione concreta>. Poi rispondi "fatto".` Non proseguire aggirando il blocco e non dichiarare completato ciò che dipende da me.
Non dichiarare il keepalive "attivo" finché non hai la prova che il primo ping schedulato (non solo quello manuale) è andato a buon fine, o spiega come verificarlo.

IMPLEMENTAZIONE (solo se serve)
Proponi o implementa una soluzione esterna, leggera e schedulata — scegli tu il meccanismo più adatto a ciò che il progetto già usa (es. workflow CI, cron esterno, scheduler dell'hosting). Requisiti:
- esegue solo una lettura minima e sicura (REST o client) su una tabella/endpoint a basso impatto
- nessuna scrittura di dati, nessuna alterazione della logica runtime dell'app
- timeout e gestione errori inclusi
- frequenza sufficiente a prevenire la sospensione, non di più
- usa solo chiavi a privilegio minimo, mai service key esposte; nessun segreto in chiaro nel repository
- documentazione operativa minima: cosa fa, dove gira, come disattivarlo

VERIFICA
Esegui o simula il ping almeno una volta e conferma che risponde correttamente.

REPORT (breve)
- esito verifica preliminare (serve / non serve / già presente)
- soluzione implementata, dove gira e con quale frequenza
- LIMITI FREE — stato attuale rispetto ai limiti del piano (DB, egress, progetti) e rischi di saturazione rilevati
- CATENA VERIFICATA — scheduler attivo, chiave configurata, policy ok, primo ping schedulato confermato o come verificarlo
- AZIONI RICHIESTE A ME — elenco sintetico di ciò che resta da fare da parte mia, o "nessuna"
- file creati o modificati
- conferma del test eseguito