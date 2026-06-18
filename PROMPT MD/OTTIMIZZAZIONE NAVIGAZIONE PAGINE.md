Esegui un'analisi enterprise-grade approfondita e completamente autonoma di questo progetto — in tutte le sue aree (es. lato user e lato admin, se presenti) — per identificare e risolvere TUTTI i problemi che compromettono fluidità, velocità e pulizia visiva della navigazione tra pagine. Sintomi tipici: transizioni lente, effetti di caricamento visibili ad ogni cambio pagina, flickering, barre/loader che appaiono dentro le tabelle, spostamenti di layout.

Hai piena autonomia su diagnosi, priorità e soluzioni. Prima rileva tu stesso lo stack tecnologico (linguaggi, framework, librerie, architettura frontend/backend) e adatta l'intera analisi a ciò che trovi.

FASE 1 — AUDIT
Analizza sistematicamente, senza limitarti a questa lista:
- meccanismo di navigazione e routing (full reload vs client-side, prefetching, blocchi)
- strategia di data fetching (chiamate ripetute, assenza di cache, richieste sequenziali evitabili, refetch di dati già disponibili)
- rendering e gestione degli stati di caricamento (loader mostrati anche quando i dati sono già disponibili)
- comportamento delle tabelle: causa esatta dei loader interni durante paginazione/ordinamento/filtri
- asset, bundle, risorse bloccanti, ottimizzazione immagini e font
- stabilità del layout durante e dopo il caricamento
- prestazioni backend: endpoint lenti, query inefficienti, cache e compressione assenti

FASE 2 — QUALITÀ DEL CODICE COLLEGATA
Valuta tutto ciò che appesantisce o sporca indirettamente la navigazione:
- file e componenti troppo lunghi o monolitici da scomporre
- codice morto, duplicato, import inutilizzati, dipendenze non usate o ridondanti
- logica duplicata tra aree dell'app da unificare
- pattern incoerenti tra le pagine (alcune ottimizzate, altre no)
- residui di debug: console.log, codice di test, commenti obsoleti

FASE 3 — DATABASE
Se il progetto usa un database (es. Supabase), analizzalo e allinealo al codice:
- query lente o inefficienti generate dal client (select *, over-fetching, N+1, join evitabili)
- indici mancanti su colonne usate in filtri, ordinamenti e join
- policy di sicurezza (es. RLS) inefficienti che rallentano le query
- allineamento tra schema DB, tipi nel codice e chiamate effettive
- paginazione lato DB invece che lato client
- opportunità di view, funzioni o query aggregate per ridurre i round-trip
- impatto di realtime/subscription se presenti

FASE 4 — REPORT