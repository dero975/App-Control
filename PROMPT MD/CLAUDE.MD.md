# CLAUDE.md — Standard operativo enterprise (universale)

Questo file e **vincolante**. Va rispettato al **100%, in modalita enterprise, senza eccezioni**, in ogni sessione e su ogni progetto — con il **minimo consumo di crediti** (massimo rapporto qualita/prezzo). Se una richiesta contraddice queste regole, fermati e segnalalo.

## 0 · Avvio sessione (sempre)
1. Leggi questo file e la cartella `DNA/` (dall'indice `00`). Da qui in poi applichi tutto.
2. Connettiti ad **App Control** (§1) e genera/aggiorna `.env`.
3. **Progetto nuovo** -> struttura tutto allo standard (§4). **Progetto esistente** -> analizza com'e fatto e allinealo in modo coerente; in caso di divergenza **vale il codice**.
4. Verifica le connessioni in sola lettura; non dichiarare "connesso" senza prova reale.
5. **Prima di qualsiasi modifica/sviluppo**, comunica gli step (§1, Regola comunicazione).

## 1 · Sincronizzazione App Control (vincolante)
App Control e la **cassaforte centrale** delle variabili di ogni progetto (suo Supabase). La connessione e **remota**, indipendente dal progetto aperto.

- **Bootstrap:** file `.agent/app-control.json` nella root (in `.gitignore`), con 4 chiavi: `projectId`, `agentKey`, `appControlSupabaseUrl`, `appControlSupabaseAnonKey`. Lo leggi a inizio sessione.
- **Accesso:** Supabase REST con header `x-app-control-project-id` + `x-app-control-agent-key` + anon key. **Lettura e scrittura**, limitate al **solo** progetto della chiave.
- **Flusso:** leggi le variabili da App Control -> **generi tu il `.env`** (l'utente non scrive mai a mano nel `.env`). Ogni variabile generata durante lo sviluppo (`SESSION_SECRET`, chiavi, URL deploy/repo, qualsiasi segreto) la **scrivi tu** in App Control e nel `.env`.
- **Chi inserisce cosa:**
  - **UTENTE** (manuale, alla creazione): `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `DATABASE_URL`, `RENDER_API_KEY`.
  - **AGENT:** `GITHUB_URL` (crei tu il repo con `gh`), `GITHUB_TOKEN`, `LINK_DEPLOY`/`LINK_DEPLOY ADMIN` (dopo il deploy) e tutti i segreti generati.
- **Nomi:** usa i nomi **canonici** (non rinominare). Le `VITE_*` non si archiviano: le generi solo nel `.env` per i frontend Vite (stesso valore).

**Regola comunicazione (fondamentale).** Prima di ogni modifica o sviluppo, **comunica SEMPRE in modo chiaro tutti gli step necessari** per sincronizzare App Control, separando **"cosa faccio io"** e **"cosa devi fare tu"** — perche l'utente potrebbe dimenticare i passaggi. Una sola azione alla volta:
`AZIONE ORA: <azione>. Poi rispondi "fatto".`

## 2 · Governance non negoziabile
Le regole sono **vincoli, non suggerimenti**: confrontale **prima** di agire; se violi, correggi **subito**.
- **Codice = unica fonte di verita.** Doc/DNA divergente -> vale il codice, riallinea la doc.
- **DB = unica fonte dei dati.** Niente dati hardcoded/mock/locali nel runtime. **Parita admin/user**: ogni entita gestita da admin e letta lato user dalla stessa fonte DB.
- **DB mai distruttivo.** Schema solo come **migrazioni versionate additive**; mai `db push`/`--force`/sync diretti su produzione. **RLS attive** su ogni tabella con dati utente.
- **Segreti:** `.env` sempre in `.gitignore`; **mai stampare** token/password/chiavi/URL con credenziali. Service role solo lato backend, mai nel frontend.
- **Git:** `git status` prima di toccare/committare; **mai committare** `.env`, backup, cache, file generati. Commit/push **solo se richiesto** e dopo che i controlli passano.
- **Push = alto rischio.** Autodeploy su un branch = **deploy in produzione**: mai pushare senza **ok esplicito**, anche se chiesto genericamente di "committare e pushare".
- **Free tier:** Supabase Free + Render (deploy unico frontend+backend). Mai saturare i limiti; segnala **prima** di avvicinarli.
- **Privacy EU:** informativa e cookie banner minimale prima del primo deploy in produzione.

## 3 · Flusso modifiche
1. Riformula in una riga **cosa fai e cosa non tocchi**.
2. Se tocca **DB, auth, deploy, architettura** o **elimina dati** -> **fermati e chiedi conferma** (piano).
3. Implementa il **minimo necessario**; riusa l'esistente; non toccare aree non dichiarate.
4. Verifica con gli script del progetto (typecheck/lint/build). **Non dichiarare test passati senza eseguirli.**
5. Chiudi **aggiornando doc/DNA nello stesso intervento**.

Fix piccoli (un testo, un colore): esegui diretto. Bug: **riproducilo e isola la causa radice** prima di pianificare.

## 4 · Struttura progetto (standard)
- Stack base: **React + Vite + TypeScript**, **Supabase** (dati), **Render** (deploy unico), **GitHub**.
- **File piccoli e modulari** (sotto il limite di righe, applicato in fase di scrittura); niente duplicazione di logica.
- **`DNA/`** come contesto canonico leggero: solo cio che un agent **non** ricava rapidamente dal codice; `00` = indice; numerazione per importanza.
- App avviabile in locale e verificabile (porta **5001** quando previsto).

## 5 · Efficienza e crediti
- Effort **sobrio** di default; alzalo **solo** per rischio reale (DB/sicurezza/architettura/refactor/bug complesso).
- **Subagent** solo se realmente necessari.
- Comunica **una azione alla volta**, sintetico, linguaggio semplice.

## 6 · Skill on-demand (vivono in App Control, NON qui)
Non appesantire questo file: queste operazioni si invocano **solo su richiesta**. Quando l'utente le chiede, **recupera il prompt corrispondente da App Control ed eseguilo**:
Pulizia e ottimizzazione · Analisi completa (sola diagnosi) · DNA (crea/riallinea) · Aggiorna DNA+Backup+Git · Ottimizzazione navigazione · Responsive mobile nativo · Qualita progetto adattiva · Keepalive Supabase · Testing visivo automatizzato · Fix complesso controllato · Crea/aggiorna `.env` · Refactoring (ripensamento progetto).
