# CLAUDE.md — App Control

Contesto operativo per Claude Code. Leggere prima `README_OPERATIVO.md`, poi i file `DNA/` pertinenti al task.

---

## Progetto

App Control è una web app privata in React + TypeScript + Vite. Gestisce progetti, prompt, variabili, immagini e clienti. Backend: solo Supabase (nessun server custom). Deploy: Render Static Site su branch `main`.

## Stack

- Frontend: React 18, TypeScript, Vite, CSS custom, lucide-react
- Backend: Supabase (database + RLS + funzioni SQL)
- Deploy: Render Static Site → autodeploy da GitHub `main`
- Keepalive: GitHub Actions (schedulato)
- Backup: Google Sheets via Apps Script

## Comandi disponibili

```bash
npm run dev          # avvio locale (porta 5173 di default)
npm run build        # build produzione (esegue typecheck + vite build)
npm run lint         # lint
npm run typecheck    # solo TypeScript
npm run check:all    # typecheck + lint + build
```

## Variabili ambiente necessarie (file .env locale)

```
VITE_SUPABASE_URL=
VITE_SUPABASE_ANON_KEY=
```

## Architettura src/

- `src/app/` — shell, sidebar, navigazione
- `src/features/projects/` — gestione progetti, variabili, immagini, sync agent
- `src/features/prompts/` — libreria prompt
- `src/features/customers/` — workspace clienti
- `src/features/dashboard/` — riepilogo read-only
- `src/features/settings/` — PIN e dispositivo attendibile
- `src/features/access/` — schermata PIN
- `src/components/` — componenti condivisi
- `src/lib/` — supabase client, PIN, clipboard, utilities
- `src/types/app.ts` — tipi dominio

## Regole non negoziabili

- Non usare `SUPABASE_SERVICE_ROLE_KEY` nel frontend — mai.
- Non loggare o stampare segreti, token, password o chiavi.
- Non aggiungere backend, auth email/password o storage senza richiesta esplicita.
- Non riattivare RLS permissive `using (true)` sulle tabelle operative.
- Non duplicare logiche esistenti — verificare prima se esiste già.
- File sotto 300 righe. Se un file cresce oltre, dividerlo subito.
- Autosave attivo su dettaglio progetto — nessun pulsante manuale "Salva".
- Il codice reale è fonte primaria. DNA/ è contesto, non sostituto.

## Flusso modifiche

1. Leggi `README_OPERATIVO.md` e i file `DNA/` pertinenti.
2. Verifica il codice reale prima di modificare.
3. Per modifiche a DB/RLS/SQL: proponi la migration, aspetta conferma.
4. Per deploy: `git push origin main` → Render autodeploy.
5. Aggiorna `DNA/` solo se cambia una logica, un vincolo o un'integrazione reale.
6. Se noti qualcosa di significativo, aggiungilo a `LEARNINGS.md`.

## Agent API (Claude Code su altri progetti)

Ogni progetto in App Control ha `projectId` + `agentKey`. Gli agent esterni leggono i dati progetto via Supabase REST con header `x-app-control-project-id` e `x-app-control-agent-key`. Sola lettura, project-scoped. Documentato in `DNA/05_AGENT_API.md`.
