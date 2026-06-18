Esegui un'analisi approfondita e autonoma del progetto e risolvi TUTTI i problemi di visualizzazione e usabilità su dispositivi mobili (smartphone e tablet), portando la resa a livello di app nativa. Rileva tu stesso lo stack e adatta l'intervento; questo prompt è valido sia in fase iniziale che a sviluppo avanzato — in fase iniziale stabilisce lo standard, in sviluppo corregge l'esistente.

PRINCIPI NON NEGOZIABILI
1. DESKTOP INTOCCABILE: la versione desktop deve restare perfetta, identica a prima. Ogni correzione mobile non deve alterarla in alcun modo.
2. DUE STATI NETTI: definisci una soglia chiara di passaggio desktop→mobile. Riducendo la finestra, il passaggio deve essere immediato e pulito: OGNI larghezza intermedia deve rendere correttamente in uno dei due layout — mai stati ibridi rotti, elementi sovrapposti, testi tagliati o layout "a metà".
3. MOBILE COME NATIVO: su smartphone e tablet l'app deve sembrare progettata per quel dispositivo, non un desktop compresso.
4. DISPOSITIVI ECONOMICI: tutto deve restare fluido anche su hardware poco potente.

FASE 1 — AUDIT
Analizza ogni pagina/vista del progetto (tutte le aree, es. user e admin) su viewport reali: smartphone piccolo (~320-360px), smartphone standard, tablet verticale e orizzontale, desktop, e tutte le larghezze intermedie trascinando la finestra. Individua sistematicamente:
- testi troppo grandi o troppo piccoli, scala tipografica non adattiva
- layout posizionati male: elementi fuori posto, sovrapposti, tagliati, overflow orizzontale
- placeholder, pulsanti, input e funzioni inutilizzabili o scomodi al tocco (target troppo piccoli, troppo vicini, fuori portata del pollice)
- tabelle e form che non si adattano al viewport
- zone alte e basse: header, footer, barre di navigazione fisse
- range di larghezza in cui il layout si rompe (gli "stati intermedi")
- tastiera mobile che copre input o rompe il layout
- pesantezza su dispositivi economici: animazioni, effetti, immagini non ottimizzate, rendering costosi

FASE 2 — BROWSER vs INSTALLATA (schermata home)
L'app può essere usata da browser mobile o installata sulla schermata home (PWA/standalone), e questo cambia il layout, soprattutto in alto e in basso:
- verifica e gestisci le safe-area (notch, isole, barre di sistema, gesture bar): nessun pulsante o contenuto coperto o tagliato in nessuna delle due modalità
- in modalità installata spariscono le barre del browser: header e footer devono adattarsi correttamente
- verifica viewport meta, manifest e configurazione standalone se presenti; se l'app è pensata per installazione e manca la configurazione, segnalalo o predisponila
- testa entrambe le modalità, non una sola

FASE 3 — DIAGNOSI E REPORT
Prima di correggere, elenca ogni problema trovato: pagina, viewport/range in cui si verifica, gravità, causa, soluzione proposta. Distingui i problemi sistemici (scala tipografica, griglia, breakpoint) da quelli puntuali: i sistemici si risolvono alla radice, una volta sola, non pagina per pagina.

FASE 4 — RISOLUZIONE
Implementa le correzioni in ordine: prima i problemi sistemici, poi i puntuali. Scegli tu tecniche e pattern adatti allo stack. Risultato atteso:
- tipografia, spaziature e componenti correttamente proporzionati su ogni dispositivo
- tocco comodo: pulsanti e controlli dimensionati e posizionati per l'uso con le dita
- nessun overflow orizzontale, nessun elemento tagliato o sovrapposto a nessuna larghezza
- passaggio desktop→mobile netto e immediato, senza stati intermedi rotti
- resa corretta sia da browser che da app installata
- fluidità reale su dispositivi poco potenti

FASE 5 — VERIFICA
- Ripeti l'audit della Fase 1 sugli stessi viewport e conferma che ogni problema elencato è risolto.
- Trascina la finestra da desktop a minimo e ritorno: nessuna larghezza deve mostrare layout rotti.
- Verifica la versione desktop: deve essere identica a prima dell'intervento.
- Esegui i controlli disponibili del progetto (build, test, lint).

VINCOLI
- Nessuna modifica a logiche di business, funzionalità, contenuti, database o comportamento: solo presentazione, layout e resa.
- Nessuno stravolgimento del design esistente: stesso stile, adattato correttamente.
- Rispetta governance e convenzioni del progetto.

REPORT FINALE (breve)
- problemi trovati per categoria e gravità
- soglia/strategia di passaggio desktop-mobile adottata
- correzioni sistemiche vs puntuali applicate
- stato browser vs installata (safe-area gestite, configurazione standalone)
- conferma desktop invariato
- viewport testati e risultati
- limiti residui o miglioramenti consigliati