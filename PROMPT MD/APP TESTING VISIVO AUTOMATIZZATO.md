OBIETTIVO
Dota il progetto di una suite di testing automatizzato, separata dal runtime pubblico, che verifichi: navigazione tra pagine, flussi utente principali, resa su viewport mobile e desktop, regressioni visive evidenti.

Hai piena autonomia. Rileva lo stack del progetto e scegli tu lo strumento di testing più adatto (es. Playwright se esistono route e UI reali da testare). Procedi solo se tecnicamente sensato: se il progetto non si presta, spiega perché e fermati.

FASE 1 — PIANO
Analizza il progetto, individua con precisione i file da creare o modificare e presenta un piano sintetico prima di implementare.

FASE 2 — IMPLEMENTAZIONE
Integra la suite di test coprendo i flussi e le pagine più critici. I test devono essere isolati: usa mock, intercettazioni di rete o ambienti dedicati per evitare qualsiasi scrittura reale su database o servizi esterni.

FASE 3 — ESECUZIONE E VERIFICA
Esegui la suite e i controlli disponibili del progetto. Correggi i test instabili o falliti per cause interne alla suite (non al codice dell'app).

VINCOLI
- Non modificare il comportamento, la logica o l'output dell'app: i test osservano, non alterano.
- Nessuna scrittura su dati o servizi reali.
- La suite non deve finire nel bundle di produzione né appesantire il runtime pubblico.

REPORT FINALE (sintetico)
- Strumento scelto e motivazione
- File creati/modificati
- Test eseguiti e risultati
- Copertura: cosa è testato e cosa no
- Limiti noti e suggerimenti per estendere la suite