OBIETTIVO
Configura Devin Desktop (ex Windsurf) su questo device per sviluppo enterprise: installa e verifica un set globale di estensioni, strumenti CLI e impostazioni per lavorare su progetti frontend, backend, TypeScript, Node, database, test, GitHub e automazioni.
Non modificare progetti specifici, salvo richiesta separata.

NOTA TRANSIZIONE
Il prodotto è in transizione da Windsurf a Devin Desktop: comandi, cartelle e settings potrebbero esistere sotto entrambi i nomi. Rileva tu quale naming è attivo su questo device e usa quello reale; se trovi residui della vecchia installazione che creano conflitti, segnalali senza eliminarli.

FASE 1 — VERIFICA IDE
Versione installata, comando CLI disponibile da terminale (es. `devin` o legacy `windsurf`), cartella estensioni, settings globali utente.

FASE 2 — ESTENSIONI
Installa o verifica: OpenAI/Codex, ESLint, Prettier, Tailwind CSS IntelliSense, Playwright, Vitest, YAML, EditorConfig, Error Lens, Pretty TypeScript Errors, DotENV, REST Client, Docker/Containers, GitHub Actions.
Se un'estensione non esiste più o ha un sostituto ufficiale migliore, usa l'alternativa e segnalalo. Puoi proporre (senza installare) altre estensioni ad alto valore che noti mancare.

FASE 3 — SETTINGS GLOBALI (non invasivi)
- format on save attivo, Prettier come formatter default
- ESLint fix on save solo per fix espliciti/sicuri
- diagnostica TypeScript di progetto attiva
- file `.env*` associati a DotENV
Non sovrascrivere personalizzazioni utente esistenti senza segnalarlo.

FASE 4 — STRUMENTI CLI
Verifica: node, npm, pnpm, yarn/corepack, git, git-lfs, gh, supabase, docker, psql, CLI dell'IDE.
Se manca uno strumento importante: installalo solo con metodo ufficiale e sicuro. Se serve login, fermati e chiedi una sola azione concreta nel formato:
`AZIONE ORA: <azione concreta>. Poi rispondi "fatto".`

FASE 5 — AUTENTICAZIONI E CONNETTORI
- GitHub CLI: `gh auth status`
- Supabase CLI: verifica solo se serve
- MCP/connettori e agent ACP configurati nell'IDE: verifica la configurazione se presente, senza creare integrazioni speculative
- Non chiedere né stampare mai token, password o segreti; non salvare segreti in repository

OUTPUT FINALE (breve, schema fisso)
STATO — IDE (nome e versione rilevati) / Estensioni / Settings / CLI / GitHub / Supabase / Docker-Postgres / MCP-Connettori
INSTALLATO — installazioni eseguite
MANCANTE — cosa manca e perché
RESIDUI TRANSIZIONE — eventuali conflitti o doppioni Windsurf/Devin rilevati
PROPOSTE — eventuali estensioni/strumenti consigliati non installati
AZIONE RICHIESTA A ME — una sola, solo se serve
PROSSIMO STEP — cosa fare dopo