# DIAGNOSI + PIANO DI CORREZIONE — Sincronizzazione Agent ⇄ App Control

**Data:** 19 Giugno 2026
**Analisi basata su:** codice sorgente reale di App Control (`/Users/dero/Documents/App Control`) + test API in lettura sul backend + schema canonico `DNA/04_SUPABASE_SCHEMA_SQL.md`.
**Progetto-test:** etichetta `rebecca` · slug nel JSON di Sync = `nuovo-progetto-18`
**Backend App Control (Supabase):** `vpuvvelvggdooyidxach.supabase.co`

> ### ▶️ ISTRUZIONI PER L'AGENT DI APP CONTROL
> Questo file è stato prodotto da una sessione su un progetto-client (Rebecca) e va eseguito **dall'interno del progetto App Control**.
> Quando l'owner dice *"analizza ed esegui diagnosi.md"*:
> 1. Leggi tutto il documento (causa in cima, piano in fondo).
> 2. Verifica lo stato reale del DB con la **FASE 0** del piano (sola lettura).
> 3. Mostra all'owner cosa cambierai e **chiedi il "vai" esplicito** (regola di `DNA/06_APP_CONTROL_SYNC.md`).
> 4. Applica la migrazione della **FASE 1** (additiva e reversibile).
> 5. Esegui i **test di accettazione** della **FASE 2** e riporta gli esiti.
> Lo stato attuale del documento è **diagnosi completa + piano pronto**; finora **nessuna modifica** è stata applicata al DB o al codice.

---

## 🎯 LA CAUSA ESATTA (trovata nel codice — non è più un'ipotesi)

> **Le policy di sicurezza (RLS) confrontano il campo SBAGLIATO.**
> Controllano la colonna `projects.id` (un UUID/identificativo interno), ma il tab **Sync** mette nel JSON lo **slug** del progetto (`nuovo-progetto-18`), che il codice salva in **un'altra colonna** (`projects.agent_project_id`). I due valori non coincidono mai → la policy nega sempre l'accesso → **ogni tabella torna `[]` (0 righe)**.

### La prova, in 3 pezzi di codice

**1) Alla creazione, il progetto ha DUE identificativi diversi**
File `src/features/projects/projectPageModel.ts`, funzione `createEmptyProject` (riga ~71):
```js
id: `project-${Date.now()}`,     // identificativo interno (NON è lo slug)
...
projectId,                       // = createProjectSlug(name) → es. "nuovo-progetto-18"
agentKey: generateAgentKey(),
```
→ `projectId` (lo **slug**) è ciò che finisce nel file `.agent/app-control.json` (tab Sync).

**2) Nel database, lo slug viene salvato in `agent_project_id`, non in `id`**
File `src/features/projects/projectRepository.ts`, funzione `createProjectRecord` (righe ~86-110):
```js
.from('projects').insert({
  agent_project_id: project.agent.projectId,   // ← lo slug "nuovo-progetto-18" va QUI
  name: ...,
})
// e la chiave agent:
.from('project_agent_keys').insert({
  project_id: createdProject.id,               // ← qui si usa l'id interno (UUID)
  key_ciphertext: project.agent.agentKey,
})
```

**3) Ma la policy RLS confronta `id`, NON `agent_project_id`**
File `supabase/migrations/20260617_01_agent_key_access.sql` (righe 106-109):
```sql
create policy projects_agent_select on public.projects for select to anon, authenticated using (
  id::text = public.app_control_request_project_id()          -- ← confronta id col valore dell'header
  and public.app_control_request_is_agent_authorized_for_project(id::text)
);
```
La funzione `app_control_request_project_id()` ritorna l'header `x-app-control-project-id`, cioè **`nuovo-progetto-18`** (lo slug). Quindi il confronto è:
```
id::text  ==  "nuovo-progetto-18"
(UUID interno)  (slug)   → SEMPRE FALSO
```
**Verificato:** nessuna delle migrazioni usa `agent_project_id` nelle policy (controllato con grep su tutta la cartella `supabase/migrations/`). Tutte confrontano `id::text` con l'header. → il bug è sistematico, su **tutte** le tabelle del canale agent.

---

## 🔁 PERCHÉ "ERA STATO VERIFICATO E FUNZIONAVA"

La documentazione interna `DNA/06_APP_CONTROL_SYNC.md` (righe 57-58) dichiara:
> *"applicata al DB di produzione il 18 Giugno 2026 e verificata end-to-end… READ 200, INSERT 201, UPDATE 204, DELETE 204; scrittura cross-progetto bloccata 401."*

Com'è possibile, se è rotto? **Spiegazione tecnica:** quasi certamente il test end-to-end è stato fatto passando come `x-app-control-project-id` l'**`id` interno** del progetto di test (che soddisfa `id::text = header`), **non lo slug** (`agent_project_id`) che il tab Sync genera per i progetti reali. Col valore "giusto per la policy" tutto risponde 200/201; col valore che il prodotto realmente distribuisce (lo slug), risponde `[]`. **Il test non rispecchiava il dato reale del Sync.**

---

## 🐛 PROBLEMI SECONDARI EMERSI (oltre alla causa principale)

| # | Problema | Prova | Impatto |
|---|----------|-------|---------|
| **P1 — CAUSA PRINCIPALE** | RLS confronta `id` invece di `agent_project_id` | codice migrazione + repository | **Blocca tutto** (0 righe) |
| **P2** | Le RPC `app_control_request_project_id` / `_agent_key` **non validano**: rispondono a specchio qualsiasi valore (anche `PIPPO-INVENTATO`) | TEST I/E | Confonde la diagnosi; non è un buco di sicurezza (la validazione vera è in `verify_agent_key`), ma è fuorviante |
| **P3** | Nome colonna valore: è **`value_text`**, non `value` | `DNA/05_AGENT_API.md` riga 48 (`select=key,value_text`) | I prompt/agent che usano `value` falliscono in scrittura (HTTP 400) |
| **P4** | Il tab Sync genera il JSON con lo **slug**, mentre tutto il resto (RLS) ragiona sull'`id`/`agent_project_id`: c'è ambiguità su "cosa sia `projectId`" | confronto Sync vs schema | È l'origine della confusione: lo stesso concetto ha 2-3 rappresentazioni |
| **P5** | `app_control_request_agent_key` è eseguibile da `anon` e **restituisce la chiave inviata** | TEST D | Non grave (ritorna ciò che il chiamante già conosce), ma da rivedere |

> **Nota di sicurezza positiva:** il sistema **non** usa la `service_role` per il canale agent (scelta corretta dell'owner). La validazione della chiave esiste davvero (`app_control_verify_agent_key` controlla `project_agent_keys.key_ciphertext`). Il problema è solo che la **condizione di match sul progetto** usa il campo sbagliato.

---

## ✅ DI CHI È L'ERRORE

- 🧑 **Utente: nessun errore.** Dati e screenshot corretti. L'intuizione "il Sync usa il nome interno invece di rebecca" era **giusta e ha indicato la direzione esatta**: il problema è proprio l'identificativo del progetto nel Sync che non combacia con quello usato dalle policy.
- 📄 **Prompt (BOOTSTRAP / CLAUDE.md): non sono la causa.** Sono corretti. Tutt'al più potrebbero usare il nome colonna reale (`value_text`) e un auto-test, ma non c'entrano col blocco.
- 🛠️ **App Control (backend): è qui l'errore**, ed è **un solo bug preciso** (P1) più alcune scorie (P2-P5): le policy RLS del canale agent confrontano `projects.id` invece di `projects.agent_project_id`.

---

## 🔧 COSA ANDREBBE CORRETTO (proposta, da decidere e fare TU — qui nessuna modifica)

> Tutto lato **App Control** (Supabase `vpuvvelvggdooyidxach`). Da fare come owner, con una nuova migrazione additiva. **Non eseguito**: è solo la proposta.

**Correzione principale (P1).** Riscrivere le policy del canale agent perché il match avvenga sullo slug. Due alternative:

- **Opzione A — match diretto su `agent_project_id`:**
  ```sql
  -- esempio per projects
  using (
    agent_project_id = public.app_control_request_project_id()
    and exists (
      select 1 from public.project_agent_keys k
      where k.project_id = projects.id
        and k.key_ciphertext = public.app_control_request_agent_key()
    )
  );
  -- per le tabelle figlie (project_env_variables, ecc.): join su projects per tradurre
  -- project_id (UUID) ⇄ agent_project_id (slug)
  ```
- **Opzione B — la funzione `app_control_request_project_id()` traduce lo slug in UUID** una volta sola (cercando in `projects.agent_project_id`), così le policy esistenti continuano a confrontare `id` ma con il valore già tradotto.

**Scorie:**
- **P3:** allineare nome colonna valore (`value_text`) ovunque lo si citi.
- **P2/P5:** rendere le RPC `request_*` non pubbliche o farle fallire con credenziali errate (chiarezza, non sicurezza).
- **P4:** documentare in modo netto che `projectId` (Sync) = `agent_project_id` (DB) = slug, e che `id` è solo interno.

**Test di accettazione (dopo la fix):**
- `GET project_env_variables` con header `x-app-control-project-id: nuovo-progetto-18` → **7 righe** (5 piene + `GITHUB_URL`/`GITHUB_TOKEN` vuote), non `[]`.
- `INSERT`/`UPDATE` su `project_env_variables` del proprio progetto → 201/204.
- Stesse chiamate con slug di un altro progetto → bloccate.

---

## 📜 SEQUENZA ESATTA DI COSA È SUCCESSO (cronologia)

Legenda: 🧑 utente · 🤖 agent · ✅ ok · ❌ fallito · ⚠️ depistaggio

| # | Chi | Azione | Esito |
|---|-----|--------|-------|
| 1 | 🧑 | Prompt iniziale progetto "Rebecca Atelier" (app vetrina mobile-first) + 2 loghi | ✅ |
| 2 | 🤖 | Analizza cartella (nuova, solo loghi), li legge | ✅ |
| 3 | 🤖 | Chiede dove salvare i dati | ✅ |
| 4 | 🧑 | Sceglie **Supabase** | ✅ |
| 5 | 🤖 | Propone di costruire l'app e collegare Supabase dopo | (in attesa) |
| 6 | 🧑 | **STOP:** "prima il BOOTSTRAP" + **1° JSON** (`projectId: nuovo-progetto-18`) | ✅ legittimo |
| 7 | 🤖 | Crea `.agent/app-control.json` + `.gitignore` | ✅ |
| 8 | 🤖 | Si connette, trova i nomi tabella, **legge → tutte `[]`** | ❌ |
| 9 | 🧑 | "il progetto si chiama **rebecca**" | ⚠️ |
| 10 | 🤖 | Riprova con `rebecca`, `Rebecca`, `rebecca-atelier` → `[]` | ❌ |
| 11 | 🧑 | **2° JSON** con `projectId: rebecca` | ⚠️ (non corretto) |
| 12 | 🤖 | Aggiorna e rilegge → `[]` | ❌ |
| 13 | 🧑 | "puoi leggere il tab Sync di rebecca?" | — |
| 14 | 🤖 | Spiega: non può aprire l'interfaccia, solo l'API con le chiavi | ✅ |
| 15 | 🧑 | **Screenshot tab SYNC** | ✅ decisivo |
| 16 | 🤖 | Scopre: il JSON ufficiale ha `projectId: nuovo-progetto-18` (rebecca = etichetta). Torna a quello, rilegge → `[]` | ✅/❌ |
| 17 | 🧑 | **Screenshot tab VARIABILI** (5 piene + 2 vuote) + chiede report MD | ✅ prova che i dati esistono |
| 18 | 🤖 | Test diagnostici A–M sull'API → isola il comportamento (legge header, RLS nega, RPC a specchio, scrittura ko su `value`) | ✅ |
| 19 | 🧑 | "le variabili dovevi leggerle da solo" | ✅ (l'agent ci ha provato; è il backend a negare) |
| 20 | 🧑 | "GitHub/Supabase sono solo account vuoti" | ✅ ininfluente sulla causa |
| 21 | 🧑 | "Rebecca è solo un test, non svilupparlo" | ✅ |
| 22 | 🧑 | Intuizione: "il Sync usa il nome interno (`nuovo-progetto-18`) invece di rebecca" | ✅ **indica la causa** |
| 23 | 🧑 | "apri la cartella di App Control e risolvi tu / sii aggiornato" | ✅ |
| 24 | 🤖 | Legge il **codice sorgente** di App Control (migrazioni + repository) | ✅ |
| 25 | 🤖 | **Trova la causa esatta** nel codice: RLS confronta `id` invece di `agent_project_id` | ✅ **RISOLUZIONE DIAGNOSI** |
| 26 | 🧑 | "solo diagnosi e analisi, nessuna modifica" | ✅ rispettato |

---

## 🧪 I TUOI PROMPT IN ORDINE (sintesi fedele) + mia risposta

1. **Crea l'app Rebecca Atelier** (vetrina mobile, mediterranea) → ho analizzato e chiesto dove salvare i dati.
2. **"Supabase"** → ho proposto di costruire e collegare dopo.
3. **"Prima il BOOTSTRAP"** + 1° JSON → creati i file, ma lettura `[]`.
4. **"riprova"** → ancora `[]`.
5. **"si chiama rebecca"** → provati più nomi, `[]`.
6. **2° JSON (rebecca)** → `[]`.
7. **"puoi leggere il Sync?"** → spiegato che no, solo via API.
8. **Screenshot Sync** → scoperto slug `nuovo-progetto-18`.
9. **Screenshot Variabili + "fai un MD diagnosi"** → i dati esistono; avviata diagnosi.
10. **"capire se App Control è giusto/sbagliato; idem CLAUDE.md"** → test approfonditi.
11. **"dovevi leggerle da solo"** → confermato, è il backend a bloccare.
12. **"Sistemiamo App Control" + "dovevamo procedere prima?"** → spiegato lo stop legittimo.
13. **"solo un MD: ho sbagliato io, App Control o i prompt?"** → riscritto in quest'ottica.
14. **"Rebecca è un test" + "il Sync usa il nome interno"** → intuizione confermata.
15. **"c'è molto caos"** → spiegati i problemi sommati.
16. **"riporta tutto con precisione + tua valutazione"** → fatto.
17. **"sequenza dei prompt, è importante"** → aggiunta.
18. **"l'agent di App Control deve avere la panoramica"** → aggiunto briefing.
19. **"apri App Control e risolvi tu"** → letto il codice, trovata la causa.
20. **"solo diagnosi, niente modifiche"** → questo documento, nessuna modifica.

---

## 📋 BRIEFING PER L'AGENT CHE LAVORERÀ DENTRO APP CONTROL

> Panoramica operativa. Leggi questo per primo.

**Sintomo:** un agent esterno collegato al canale Sync (anon key + header `x-app-control-project-id` + `x-app-control-agent-key`) riceve `[]` da ogni tabella e non può scrivere.

**Causa accertata (dal codice):** le policy RLS del canale agent (`supabase/migrations/20260617_01_agent_key_access.sql`) filtrano con `projects.id::text = app_control_request_project_id()`. Ma il tab Sync inserisce nel JSON lo **slug** (`agent_project_id`, es. `nuovo-progetto-18`), non l'`id`. Il confronto è quindi sempre falso. `createEmptyProject` (`projectPageModel.ts`) e `createProjectRecord` (`projectRepository.ts`) confermano i due campi distinti.

**File da guardare:**
- `supabase/migrations/20260617_01_agent_key_access.sql` — policy SELECT del canale agent (qui il bug).
- `supabase/migrations/20260618_01_agent_env_write_access.sql` — policy INSERT/UPDATE/DELETE (stesso bug ereditato).
- `src/features/projects/projectPageModel.ts` — `createEmptyProject`: `id` vs `projectId` (slug).
- `src/features/projects/projectRepository.ts` — `createProjectRecord`: salva `agent_project_id` = slug, `project_agent_keys.project_id` = id.
- `DNA/05_AGENT_API.md` — colonna valore reale: `value_text`.
- `DNA/06_APP_CONTROL_SYNC.md` — dichiara il flusso "verificato" (ma con UUID, non con slug).

**Da decidere (con l'owner) prima di toccare il DB:** Opzione A (policy su `agent_project_id`) o Opzione B (tradurre slug→UUID nella funzione header). Migrazione **additiva e reversibile**. Poi i test di accettazione qui sopra.

**Dati del test:** progetto slug `nuovo-progetto-18`, agentKey `WMB6Y-BH9VE-3Z8G6-JFP4R`, 7 variabili attese (`SUPABASE_URL`, `SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `DATABASE_URL`, `RENDER_API_KEY` piene + `GITHUB_URL`, `GITHUB_TOKEN` vuote).

---

## 🧷 PROVE TECNICHE API (sola lettura, già eseguite)

Header usati: anon key + `x-app-control-project-id` + `x-app-control-agent-key: WMB6Y-...`.

| Test | Azione | Risultato | Significato |
|------|--------|-----------|-------------|
| A | `GET project_env_variables` (header corretti) | `[]` HTTP 200 | RLS nega (causa P1) |
| B | `GET` senza header agent | `[]` HTTP 200 | idem |
| C | header con nomi alternativi | `[]` HTTP 200 | non è il nome header |
| D | RPC `app_control_request_agent_key` | ritorna la chiave inviata | il server legge gli header (ma vedi P5) |
| E | RPC `app_control_request_project_id` con **agent-key falsa** | risponde lo stesso | RPC non valida (P2) |
| F | `projects?select=id` / `agent_key` | `[]` / colonna assente | non vedo la mia riga (P1); colonna `agent_key` non esiste su `projects` |
| G | filtro `project_id=eq.nuovo-progetto-18` | `invalid input syntax for type uuid` | `project_id` è UUID, lo slug non è un UUID |
| H | `GET` con slug `rebecca`/`Rebecca`/… | tutti `*/0` | nessun nome sblocca (P1) |
| I | RPC con `PIPPO-INVENTATO` | risponde `PIPPO-INVENTATO` | RPC a specchio (P2) |
| L | `INSERT` con campo `value` | HTTP 400 *"Could not find the 'value' column"* | il campo è `value_text` (P3) |
| M | ricerca RPC di scrittura | nessuna | si scrive via REST diretto, non via RPC |

---

## 📂 STATO FILE LOCALI (progetto-test Rebecca)

| File | Stato |
|------|-------|
| `.agent/app-control.json` | ✅ creato (slug `nuovo-progetto-18` + chiavi), in `.gitignore` |
| `.gitignore` | ✅ protegge `.env`, `.env.*`, `.mcp.json`, `.agent/` |
| `.env` | ❌ non generato (lettura bloccata da P1) |
| `CLAUDE.md` da App Control | ❌ non scaricato (stessa causa) |
| App Rebecca | ⛔ non iniziata (è solo un test) |
| `rebecca.png`, `rebecca1.png` | ✅ presenti (loghi 1916×821) |

---

## 🛠️ PIANO DI CORREZIONE — PRONTO DA ESEGUIRE (dentro App Control)

> ⚠️ **Eseguire SOLO dall'interno del progetto App Control**, come owner, dopo il "vai" esplicito. Operazione su DB di produzione = alto rischio. Tutto è **additivo e reversibile** (aggiunge/sostituisce solo policy del canale agent; non tocca dati, tabelle, né le policy PIN).

### Premesse accertate dallo schema (`DNA/04_SUPABASE_SCHEMA_SQL.md`)
- `projects.id` = **UUID** (riga 242); `projects.agent_project_id` = **text** = lo **slug** del Sync (riga 245, e doc riga 41).
- Le tabelle figlie (`project_env_variables`, `project_data_fields`, `project_platform_accesses`, `project_agent_keys`) hanno `project_id uuid` → puntano a `projects.id`.
- Vincolo `unique (user_id, agent_project_id)` con `user_id` **nullable** (riga 257) → **lo slug da solo NON è garantito univoco**. Per identificare il progetto in modo sicuro si deve combinare slug **+** agentKey (`project_agent_keys.key_ciphertext`). → per questo l'**Opzione A** è la più robusta.
- Colonna valore in `project_env_variables` = **`value_text`** (riga 321), non `value`.

---

### FASE 0 — Verifica stato reale (SOLA LETTURA, nessuna modifica)

Eseguire in SQL Editor di App Control e mostrare gli esiti all'owner:

```sql
-- 0.1 Esiste il progetto-test e qual è il legame slug↔id↔agentKey?
select p.id, p.agent_project_id, p.name, k.key_ciphertext
from public.projects p
left join public.project_agent_keys k on k.project_id = p.id
where p.agent_project_id = 'nuovo-progetto-18';

-- 0.2 Quante variabili ha quel progetto? (atteso: 7)
select count(*) from public.project_env_variables v
join public.projects p on p.id = v.project_id
where p.agent_project_id = 'nuovo-progetto-18';

-- 0.3 Policy attuali del canale agent (per sapere cosa si va a sostituire)
select tablename, policyname, cmd
from pg_policies
where schemaname = 'public' and policyname like '%agent_%'
order by tablename, policyname;
```
**Atteso:** 0.1 ritorna 1 riga con `agent_project_id = nuovo-progetto-18` e `key_ciphertext = WMB6Y-BH9VE-3Z8G6-JFP4R`; 0.2 ritorna 7; 0.3 elenca le policy `*_agent_select` (+ insert/update/delete su env). Se 0.1 non torna nulla, fermarsi: il dato non è quello atteso.

---

### FASE 1 — Migrazione correttiva (OPZIONE A, consigliata)

Crea un nuovo file `supabase/migrations/20260619_01_agent_key_fix_slug_match.sql` con il contenuto sotto, poi applicalo. Sostituisce le policy del canale agent perché il match avvenga su **`agent_project_id` (slug) + agentKey**, traducendo verso `projects.id` per le tabelle figlie.

```sql
-- Fix canale agent: le policy 20260617/20260618 confrontavano projects.id
-- con l'header x-app-control-project-id, ma l'header porta lo SLUG
-- (projects.agent_project_id), non l'id UUID. Risultato: 0 righe sempre.
-- Questa migration riallinea il match su agent_project_id + agent key.
-- Additiva e reversibile: sostituisce SOLO le policy del canale agent.

-- 1) Funzione helper: l'id UUID del progetto autorizzato per la richiesta corrente
--    (slug dell'header + agent key validi insieme). NULL se non autorizzato.
create or replace function public.app_control_request_authorized_project_uuid()
returns uuid
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select p.id
  from public.projects p
  join public.project_agent_keys k on k.project_id = p.id
  where p.agent_project_id = public.app_control_request_project_id()
    and k.key_ciphertext = public.app_control_request_agent_key()
    and length(public.app_control_request_agent_key()) >= 19
  limit 1;
$$;

revoke all on function public.app_control_request_authorized_project_uuid() from public;
grant execute on function public.app_control_request_authorized_project_uuid() to anon, authenticated;

-- 2) Ricrea le policy del canale agent usando la traduzione slug -> id
do $$
begin
  -- projects: SELECT (match diretto su id tradotto)
  drop policy if exists projects_agent_select on public.projects;
  create policy projects_agent_select on public.projects
    for select to anon, authenticated
    using (id = public.app_control_request_authorized_project_uuid());

  -- project_env_variables: SELECT
  drop policy if exists project_env_variables_agent_select on public.project_env_variables;
  create policy project_env_variables_agent_select on public.project_env_variables
    for select to anon, authenticated
    using (project_id = public.app_control_request_authorized_project_uuid());

  -- project_env_variables: INSERT / UPDATE / DELETE (scrittura del proprio progetto)
  drop policy if exists project_env_variables_agent_insert on public.project_env_variables;
  create policy project_env_variables_agent_insert on public.project_env_variables
    for insert to anon, authenticated
    with check (project_id = public.app_control_request_authorized_project_uuid());

  drop policy if exists project_env_variables_agent_update on public.project_env_variables;
  create policy project_env_variables_agent_update on public.project_env_variables
    for update to anon, authenticated
    using (project_id = public.app_control_request_authorized_project_uuid())
    with check (project_id = public.app_control_request_authorized_project_uuid());

  drop policy if exists project_env_variables_agent_delete on public.project_env_variables;
  create policy project_env_variables_agent_delete on public.project_env_variables
    for delete to anon, authenticated
    using (project_id = public.app_control_request_authorized_project_uuid());

  -- project_data_fields: SELECT
  drop policy if exists project_data_fields_agent_select on public.project_data_fields;
  create policy project_data_fields_agent_select on public.project_data_fields
    for select to anon, authenticated
    using (project_id = public.app_control_request_authorized_project_uuid());

  -- project_platform_accesses: SELECT
  drop policy if exists project_platform_accesses_agent_select on public.project_platform_accesses;
  create policy project_platform_accesses_agent_select on public.project_platform_accesses
    for select to anon, authenticated
    using (project_id = public.app_control_request_authorized_project_uuid());

  -- project_agent_keys: SELECT (prompt di sync)
  drop policy if exists project_agent_keys_agent_select on public.project_agent_keys;
  create policy project_agent_keys_agent_select on public.project_agent_keys
    for select to anon, authenticated
    using (project_id = public.app_control_request_authorized_project_uuid());
end $$;
```

**Nota grant:** se in produzione i `grant ... to anon` su queste tabelle non fossero presenti, aggiungerli (lo schema base li prevede già nello Script 0B). Le RLS restano il vero filtro.

#### OPZIONE B (alternativa minimale) — tradurre lo slug dentro la funzione header
Invece di toccare tutte le policy, ridefinire **una sola** funzione perché ritorni sempre l'`id` UUID, lasciando intatte le policy `20260617/20260618` che confrontano `id::text`:
```sql
-- ATTENZIONE: cambia la semantica di app_control_request_project_id():
-- da "slug dell'header" a "id UUID risolto". Verificare che nessun altro
-- punto del codice si aspetti lo slug grezzo da questa funzione.
create or replace function public.app_control_request_project_id()
returns text
language sql stable security definer set search_path = public, pg_temp
as $$
  select p.id::text
  from public.projects p
  where p.agent_project_id = nullif(
    (nullif(current_setting('request.headers', true), '')::jsonb) ->> 'x-app-control-project-id', '')
  limit 1;
$$;
```
> Opzione B è più corta ma **meno trasparente** e cambia il significato di una funzione esistente (rischio effetti collaterali). **Consigliata l'Opzione A.**

---

### FASE 2 — Test di accettazione (dopo la fix)

Dal lato agent (anon key + header `x-app-control-project-id: nuovo-progetto-18` + `x-app-control-agent-key: WMB6Y-...`):

1. **READ** `GET /rest/v1/project_env_variables?select=key,value_text` → **7 righe** (non `[]`).
2. **READ** `projects`, `project_data_fields`, `project_platform_accesses`, `project_agent_keys` → ritornano i dati del progetto.
3. **INSERT** una variabile di prova sul proprio progetto → **201**; poi **DELETE** → **204**.
4. **ISOLAMENTO**: stessa READ con lo slug di **un altro** progetto (chiave non corrispondente) → **`[]` / 401** (nessun accesso incrociato).
5. (Opzionale) Rifare il **BOOTSTRAP** sul progetto Rebecca: l'agent deve generare il `.env` con le 7 variabili senza intervento manuale.

Se 1–4 passano, il canale Sync è riparato end-to-end.

---

### FASE 3 — Pulizia scorie (facoltativa, separata)
- **P3:** assicurarsi che ogni accesso al valore usi `value_text` (già corretto nel codice; verificare prompt/doc).
- **P2/P5:** valutare se restringere le RPC `request_*` (chiarezza; non è un buco di sicurezza perché la validazione vera è nelle policy).
- **P4:** annotare nello schema che `projectId` (Sync) = `agent_project_id` = slug; `id` è solo interno.

---

## 🧭 CONCLUSIONE

Il problema **non è tuo, non è dei prompt**: è **un singolo bug nel backend di App Control**. Le regole di sicurezza del canale agent confrontano l'identificativo sbagliato del progetto (`id` invece di `agent_project_id`/slug), quindi negano sempre l'accesso e ogni lettura/scrittura fallisce. La tua intuizione sul "nome nel Sync" puntava esattamente lì. Il flusso risultava "verificato" perché i test interni usavano l'UUID, non lo slug che il Sync distribuisce davvero.

La correzione è circoscritta (una migrazione additiva sulle policy) ma **va decisa e applicata da te come owner**, con il "vai" esplicito (come prescrive `DNA/06_APP_CONTROL_SYNC.md`). Questo documento resta **solo diagnosi**: nessuna modifica è stata effettuata.
