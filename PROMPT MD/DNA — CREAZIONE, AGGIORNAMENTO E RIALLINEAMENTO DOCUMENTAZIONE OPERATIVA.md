Lavora nel progetto corrente. Obiettivo: creare (se assente) o riallineare la cartella `DNA/` come contesto canonico del progetto in stato enterprise: completo nel panorama, leggero da caricare, così che un agent futuro possa operare a 360 gradi senza storico chat e senza chiedere informazioni basilari.

Nota: questo è l'intervento profondo. Per la manutenzione di routine esiste un prompt separato; qui analizzi e consolidi tutto.

FASE 1 — ANALISI COMPLETA
Prima di scrivere, analizza il progetto reale: codice sorgente, struttura repository, script, configurazioni, workflow CI/CD, deploy, entrypoint, documentazione esistente, file infrastrutturali, integrazioni esterne e ogni riferimento operativo tracciabile nel repo.
Il codice reale è sempre la fonte di verità primaria: se codice e documentazione divergono, fa fede il codice e `DNA/` va riallineato.

FASE 2 — CONSOLIDAMENTO
Regola fondamentale: in `DNA/` va SOLO ciò che serve davvero per lavorare sul progetto e che un agent NON può ricavare rapidamente dal codice. Doppio filtro per ogni informazione:
1. serve davvero a un agent per avere il panorama completo? Se no, fuori.
2. un agent la ricava da solo dal codice in pochi secondi (struttura cartelle, dipendenze, script del package, naming evidente)? Se sì, fuori — niente md dedicati a ciò che il repo già mostra.
Includi, quando esistono: architettura reale, flussi applicativi critici, logiche di dominio importanti, integrazioni e servizi esterni attivi, configurazioni runtime rilevanti, build/test/validazioni, deploy e ambienti, pipeline automatiche, sincronizzazioni esterne, backup, hosting, repository remoto e branch operative, URL e identificativi operativi non sensibili, procedure manuali necessarie, vincoli tecnici e organizzativi, decisioni architetturali valide, rischi noti e regole non negoziabili.
Test pratico: `DNA/` deve rispondere a domande come "qual è il repo corretto?", "dove avviene il deploy?", "quale istanza DB è collegata?", "quali workflow sono attivi?", "esistono backup, dashboard o strumenti esterni?", "quali passaggi manuali servono per operare in sicurezza?". Se la risposta è recuperabile da qualsiasi artefatto del progetto, va riportata in forma sintetica ma esplicita.

ORDINAMENTO E NUMERAZIONE
- Numera i file progressivamente in ORDINE DI IMPORTANZA OPERATIVA: prima ciò che un agent deve assolutamente leggere per lavorare in sicurezza (indice, stato progetto, regole/governance, architettura), poi il contesto di dominio, infine il materiale di consultazione occasionale.
- `00` è sempre l'indice di ingresso.
- Numerazione coerente e senza buchi: se elimini o accorpi file, rinumera. Nessun file fuori numerazione (eccetto eventuale `README.md` che punta all'indice).
- L'ordine dei numeri È la priorità di lettura: un agent che legge in ordine deve incontrare prima ciò che è indispensabile.

LEGGEREZZA E PESO OPERATIVO
`DNA/` deve tenere l'agent leggero nelle azioni e al tempo stesso perfettamente aggiornato:
- struttura minima: pochi file, ciascuno con uno scopo chiaro; l'indice `00` dice in poche righe cosa c'è, dove, e cosa è indispensabile leggere, così l'agent legge solo ciò che gli serve
- sintesi prima di tutto: frasi operative, elenchi essenziali, zero prosa di riempimento
- ELIMINA i file DNA obsoleti, duplicati o a basso valore: la potatura fa parte del consolidamento
- niente snapshot volatili che invecchiano subito (output di comandi, elenchi che il codice rigenera): meglio indicare DOVE si verifica un'informazione che fotografarla
- criterio finale: se un file non cambierebbe il comportamento di un agent che lo legge, non deve esistere

GESTIONE GAP
Se un'informazione critica non è ricavabile da nessuna fonte: non inventarla, segnala esplicitamente il gap, marcala come "DA COMPLETARE" in `DNA/` con un punto chiaro, e non lasciare zone ambigue su elementi operativi importanti.

REGOLE DI QUALITÀ
- `DNA/` non è un duplicato enciclopedico del progetto: solo contenuti ad alto valore operativo.
- Elimina o accorpa documentazione ridondante, obsoleta o dispersiva. Niente testo generico o astratto.
- Privilegia stato reale, procedure reali, riferimenti concreti, vincoli reali.
- Mai segreti, token, password o credenziali in chiaro; sì a URL, nomi ambienti, identificativi e riferimenti infrastrutturali non sensibili quando servono.

VINCOLI
- Modifica solo la cartella `DNA/` e la documentazione operativa: non toccare codice, configurazioni, database o deploy.
- Nessuna operazione Git salvo richiesta esplicita.

CRITERIO DI SUCCESSO
Dopo il riallineamento, un agent che legge `DNA/` deve poter operare sul progetto senza chiedere informazioni basilari, leggendo il minimo indispensabile per farlo. Chiudi con un report breve: file creati/aggiornati, file ELIMINATI e perché, rinumerazioni effettuate, gap segnalati, dimensione finale del DNA (numero file).


al termine avvia sempre app in local 5001