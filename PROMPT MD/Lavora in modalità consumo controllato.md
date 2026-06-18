Integra nel progetto una regola permanente e obbligatoria di consumo controllato.

Salvala nel file operativo principale del progetto, preferibilmente CLAUDE.md, AGENTS.md, README operativo, DNA progetto o documento equivalente. Se esiste già un file caricato automaticamente da Claude all’apertura del progetto, usa quello. Se non esiste, crea un file operativo dedicato e indicami chiaramente il percorso.

Non modificare codice, database, deploy o logiche applicative. Devi solo aggiornare le istruzioni operative del progetto.

REGOLA OBBLIGATORIA — CONTROLLO CONSUMI PRIMA DI OGNI TASK

Prima di iniziare qualsiasi attività sul progetto, devi fermarti e fare il seguente controllo.

Non analizzare codice, non modificare file, non avviare subagent, non eseguire task lunghi prima di questo controllo.

CHECK INIZIALE OBBLIGATORIO

Rispondi sempre prima con:

1. Agent/modello attivo: visibile / non visibile
2. Mode attiva: visibile / non visibile
3. Effort/potenza attiva: visibile / non visibile
4. Subagent previsti: sì / no
5. Contesto sessione: normale / lungo / non verificabile
6. Configurazione consigliata per questo task

Se agent, mode o effort non sono visibili con certezza, non dedurre. Chiedimi subito uno screenshot o chiedimi di indicarti la configurazione attuale.

REGOLE CONFIGURAZIONE

Default progetto:

* Effort Medium
* Plan mode per modifiche importanti
* Edit automatically solo per modifiche piccole e circoscritte
* evitare Auto mode quando l’obiettivo è ridurre consumi
* Effort High solo per bug complessi, refactor delicati, database, sicurezza, architettura o problemi ad alto rischio

Se rilevi Effort High e il task non è complesso, devi chiedermi di passare a Medium prima di procedere.

Se rilevi Auto mode e il task richiede controllo consumi, devi chiedermi di passare a Plan mode o Edit automatically prima di procedere.

SUBAGENT

Subagent vietati di default.

Puoi proporli solo se realmente necessari. Prima devi:

* spiegare perché servono;
* indicare cosa faranno;
* indicare il rischio di consumo;
* attendere mia conferma esplicita.

CONTESTO

Se la sessione è lunga o il contesto è pesante, devi chiedermi di usare:

/compact

Se cambio argomento, area del progetto o tipo di attività, devi chiedermi di usare:

/clear

Non continuare in sessioni lunghe, loop o background senza obiettivo chiuso.

FORMATO RISPOSTA INIZIALE OBBLIGATORIO

Prima di ogni task rispondi in questo formato:

CONTROLLO CONSUMI

* Agent/modello: ...
* Mode: ...
* Effort: ...
* Subagent: ...
* Contesto: ...
* Configurazione consigliata: ...
* Prima di procedere serve modifica configurazione? sì/no

Solo dopo questo controllo puoi procedere.

Al termine dell’integrazione dimmi solo:

* file aggiornato o creato;
* percorso esatto;
* se il file viene caricato automaticamente da Claude;
* eventuali limiti tecnici.
