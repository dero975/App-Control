
Esegui un'analisi enterprise-grade completa e autonoma dell'intero progetto, senza eseguire alcuna modifica. Rileva tu stesso lo stack tecnologico e adatta l'analisi a ciò che trovi.

AMBITO
Analizza tutto: codice, funzioni, logiche, configurazioni, script, dipendenze, plugin/estensioni e documentazione `.md` rilevante. Escludi `node_modules`, cartelle di build/dist, cache, coverage e artefatti temporanei, salvo reale necessità tecnica.

ANALISI
Valuta il progetto a 360 gradi rispetto a uno standard enterprise, includendo senza limitarti a:
- correttezza e coerenza di codice e logiche
- architettura, struttura e organizzazione del progetto
- qualità: codice morto, duplicazioni, file monolitici, pattern incoerenti
- prestazioni: colli di bottiglia, inefficienze, sprechi
- sicurezza: vulnerabilità, segreti esposti, configurazioni rischiose
- dipendenze: obsolete, inutilizzate, vulnerabili
- coerenza tra documentazione e stato reale del codice

DATABASE
Se il progetto è connesso a un database (es. Supabase), esegui test, verifiche e controlli incrociati per validarlo a livello enterprise: schema, relazioni, indici, policy di sicurezza, allineamento tra DB reale e codice. In particolare:
- SINCRONIZZAZIONE DATI: verifica che tutti i dati mostrati dall'app provengano esclusivamente dal DB — individua dati hardcoded, mock, file locali o copie statiche che dovrebbero invece vivere nel database
- PARITÀ ADMIN/USER: se esiste un'area admin, verifica tramite analisi di codice e query che ogni contenuto o entità gestibile da admin sia letta dal lato user dalla STESSA fonte DB, così che ogni azione admin (creazione, modifica, eliminazione, pubblicazione) sia realmente visibile lato user (es. contenuti di una pagina del sito). Segnala ogni entità gestita in admin ma non collegata al lato user, o viceversa. Se la conferma definitiva richiederebbe un test di scrittura reale, NON eseguirlo: elencalo nel report come test manuale da fare

VERIFICA RUNTIME
Avvia l'app in locale sulla porta 5001 (forzala se occupata) e verifica il comportamento reale: errori in console, warning, anomalie visibili.

OUTPUT — SOLO IN CHAT
Fornisci una panoramica chiara e completa del progetto, poi un report con:
- problemi e incoerenze trovati (con posizione nel codice)
- dati non provenienti dal DB e disallineamenti admin/user rilevati
- rischi, con gravità
- miglioramenti consigliati
- test manuali consigliati (es. verifiche di scrittura admin→user non eseguibili in sola lettura)
- priorità di intervento ordinate per impatto

VINCOLO ASSOLUTO
Nessuna modifica a codice, file, configurazioni o database. Solo analisi, diagnosi e report.

OBIETTIVO FINALE: fotografia completa e affidabile dello stato del progetto rispetto allo standard enterprise.