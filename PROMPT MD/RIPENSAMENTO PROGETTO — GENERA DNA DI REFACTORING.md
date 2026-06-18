RIPENSAMENTO PROGETTO — GENERA DNA DI REFACTORING

Lavora nel progetto corrente. Obiettivo: produrre la knowledge base completa (`DNA/`) per il ripensamento/refactoring di questo progetto, tale che un agent di sviluppo (umano o AI) possa iniziare a costruire la nuova versione SENZA più domande.

FASE 0 — DOMANDE (max 5)
Analizza prima il repository e il progetto esistente. Poi, solo per ciò che non è ricavabile da codice, documentazione o brief, chiedimi al massimo 5 cose tra:
1. cliente/brand e contesto
2. modello di business (e-commerce, booking, editoriale, gestionale, associativo, marketplace, ibrido, altro)
3. obiettivi prioritari del ripensamento
4. lingue/mercati al lancio
5. vincoli noti (budget, brand esistente, free-tier obbligatorio, vincoli legali)
Tutto il resto lo decidi tu e lo documenti.

FASE 1 — ANALISI DELL'ESISTENTE
Costruisci dal repo reale (e dall'eventuale versione online) l'inventario di partenza:
- cosa esiste oggi: funzionalità, pagine/sezioni, logiche di dominio, contenuti, integrazioni, database
- cosa va preservato, cosa va ripensato, cosa va eliminato — con motivazione
- per i siti/app pubblici: mappa completa degli URL attuali per i redirect (preservazione SEO)
- debiti tecnici e vincoli ereditati che condizionano il nuovo progetto

FASE 2 — COSTRUZIONE DNA/
Crea la cartella `DNA/` in file numerati e cross-linkati che copra, dove applicabile al tipo di progetto:
- Identità: visione, obiettivi misurabili, KPI, scope incluso/escluso, stakeholder
- Brand: logo, palette, tipografia, immagini, tone of voice
- Design system: token, componenti, dark/light, accessibilità, responsive
- Architettura informativa: struttura completa, URL, mappa redirect dal vecchio progetto, hreflang se multilingua
- Pagine/viste: anatomia sezione per sezione, con dati richiesti da ciascuna
- Tech stack: framework, librerie approvate, struttura cartelle, scelte motivate (ADR)
- Database: schema completo, indici, policy di sicurezza, trigger, funzioni
- Logica di dominio: il modello business reale con flussi utente ed edge case
- Modello contenuti: come sono strutturate le entità (prodotti, eventi, articoli, record...)
- Admin: pannello per staff non tecnico, sezione per sezione, con modalità dev per testing
- Integrazioni: pagamenti, email, social, analytics, mappe, servizi esterni
- SEO: tecnico + dati strutturati + strategia contenuti (se progetto pubblico)
- Performance e accessibilità: Core Web Vitals e WCAG 2.2 AA come criteri di accettazione
- Sicurezza e privacy: GDPR, cookie minimale legale, hardening, gestione secrets
- Multilingua: solo se ≥ 2 lingue al lancio
- Inventario contenuti esistenti + action items cliente
- Roadmap: fasi, milestone, criteri di accettazione, stima
- Agent guide: convenzioni codice, naming, testing, librerie approvate, regole per agent AI
- Setup backend: script consegnabile (migrations, policy, funzioni, seed, verify, backup)
- Registro decisioni: scelte vincolanti raccolte o proposte, con stato
- Prompt operativo: file `prompt_start_agent.md` che avvia l'agent di sviluppo successivo

QUALITÀ ATTESA
- Specifico: ogni file customizzato sul progetto reale, niente template generico
- Operativo: schemi DB veri, URL veri, dati richiesti espliciti; nessun "TBD" senza ragione
- Coerente: una decisione vale ovunque, citata in modo identico (cross-link, mai duplicazioni)
- Motivato: ogni scelta architetturale ha il "perché" accanto
- AI-agnostic: indistinguibile da lavoro umano, nessun riferimento al provider AI
- Free-tier first: stack senza costi ricorrenti dove possibile, solo commissioni transazionali
- Reversibile: ogni integrazione esterna ha un fallback
- Admin pensato per staff non tecnico del cliente
- Migrazione SEO preservante se esiste un sito pubblico: ogni URL attuale → redirect mappato
- Conformità legale del contesto (cookie banner minimale se Europa, trasparenza se terzo settore)

NON DEVI
- scrivere codice di produzione (solo schemi e snippet illustrativi)
- inserire segreti, chiavi o token reali
- creare lock-in su un singolo provider
- rimandare decisioni risolvibili con buon senso: proponi, registra, marca "in attesa di conferma"

DEFINIZIONE DI COMPLETO
Un developer legge `DNA/` in ordine e ha tutto per iniziare: nessuna domanda residua sul "cosa" e sul "come". Le uniche questioni aperte dipendono da azioni del cliente (credenziali, materiali) e sono raccolte negli action items.

OUTPUT FINALE
1. Cartella `DNA/` completa
2. Sintesi ≤ 20 righe: identità, principi, fasi, deliverable critici, action items cliente
3. Conferma esplicita che il DNA rispetta tutti i criteri sopra