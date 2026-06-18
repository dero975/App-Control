# Fix futuro — Raccolta errori (silent error tracking)

> **Stato:** PIANIFICATO, non implementato. Da fare quando il resto e chiuso.
> **Scopo:** raccogliere gli errori silenziosi di App Control mentre l'owner lavora su altri progetti, per poi analizzarli e risolverli in ordine ricollegando l'agent.

## 1. Problema

App Control e un'app privata (React/Vite, Supabase, Render static, **single-user**). Quando l'owner lavora su altri progetti non puo monitorare in tempo reale. Errori silenziosi — eccezioni JS non gestite, chiamate Supabase fallite, problemi PWA — passano inosservati. Serve raccoglierli per affrontarli dopo, in modo ordinato.

## 2. Serve davvero Sentry? — Valutazione funzionale onesta

Domanda chiave: per un'app privata, single-user, a basso traffico, ha senso un servizio esterno come Sentry?

**Risposta: no, non e necessario.** Sentry e pensato per app con molti utenti dove non puoi riprodurre gli errori. Qui:

- un solo utente (l'owner), volume bassissimo;
- il codice e nostro e spesso riproducibile;
- l'infrastruttura (Supabase + canale agent in lettura/scrittura) permette gia di raccogliere e leggere errori in casa.

**L'unico vantaggio reale di Sentry** sarebbe la simbolicazione degli stack trace minificati via source map + i breadcrumbs automatici. Utile, ma non decisivo a questa scala: con messaggio + stack + contesto + timestamp salvati in casa, nel ~90% dei casi si individua il problema.

**Contro di Sentry per questo caso:** account/servizio esterno da gestire, limiti free tier (~5k errori/mese, 1 progetto, ~30 giorni di retention), i dati escono dal device, serve DSN + configurazione di scrubbing.

➡️ **Decisione: soluzione interna (tabella nel Supabase di App Control), non Sentry.** Sentry resta un fallback documentato (vedi §5) se un giorno gli stack minificati in produzione diventano un vero ostacolo.

## 3. Soluzione consigliata — tabella errori in App Control (in-house)

Gratis per sempre, integrata, privata, leggibile dall'agent.

### 3.1 Schema (additivo, una migration)

Tabella `public.app_errors`:

- `id` uuid pk default gen_random_uuid()
- `created_at` timestamptz default now()
- `source` text — `frontend` | `supabase` | `pwa`
- `level` text default `error` — `error` | `warning`
- `message` text not null
- `stack` text — stack trace (puo essere minificato)
- `context` jsonb — `{ route, action, app_version, userAgent }` SENZA segreti
- `resolved` boolean default false

RLS: insert con lo stesso modello di accesso dell'app (PIN/dispositivo) o policy dedicata; **lettura agent** via agent key (stesso meccanismo di `project_env_variables`). Nessuna lettura anonima libera. Indici su `(created_at desc)` e `(resolved)`.

### 3.2 Cattura (frontend)

- **Error Boundary React** a livello app: cattura i crash di rendering -> insert.
- **`window.onerror`** e **`window.onunhandledrejection`**: errori globali + promise non gestite.
- **Wrapper chiamate Supabase**: dove gia gestiamo gli errori, in caso di errore logghiamo codice + messaggio.
- **Throttle/dedup**: non inserire lo stesso errore in loop (cap per minuto + dedup per hash di message+stack).

### 3.3 Cosa NON loggare (vincolo di sicurezza)

- Mai token/chiavi/password/URL con credenziali/contenuti `.env`.
- Mai dati personali nel `context`. Solo: route, azione, versione, userAgent, codice errore.
- Scrub dei valori sospetti prima dell'insert.

### 3.4 Free tier / retention

- Le righe sono piccole, ma vanno limitate: retention (es. cancella > 30-60 giorni) e/o cap (mantieni ultime N).
- Pulizia con job leggero (es. l'Apps Script gia presente o una funzione schedulata); nessuna crescita illimitata.

### 3.5 Workflow di risoluzione (il punto centrale)

1. L'owner lavora su altri progetti; gli errori si accumulano in `app_errors`.
2. Quando vuole, mi ricollega ad App Control.
3. Io leggo gli errori via canale agent, li raggruppo per frequenza/tipo e propongo le fix in **ordine di priorita**.
4. Risolviamo; marco `resolved = true` gli errori sistemati.

## 4. Passi di implementazione (quando si fara)

1. Migration additiva `app_errors` + policy (agent read + app insert). Applicare con conferma (e una modifica DB).
2. ErrorBoundary + handler globali + wrapper Supabase nel frontend.
3. Throttle/dedup + scrub segreti.
4. Pulizia/retention.
5. Test su PROGETTO TEST: generare un errore finto, verificare insert + lettura agent + cleanup.
6. Doc: aggiornare DNA se diventa logica stabile.

## 5. Alternativa Sentry — quando avrebbe senso

Adottare Sentry SOLO se in futuro:

- gli stack minificati in produzione rendono troppo difficile capire i crash, **e**
- serve una dashboard/alerting pronti, oppure l'app cresce a molti utenti.

In tal caso: `@sentry/react`, init con DSN (in env, mai in chiaro nel repo), upload source map in fase di build, scrubbing PII (`beforeSend`), free tier. Resta integrabile in parallelo alla tabella interna.

## 6. Decisione

**Soluzione interna (tabella `app_errors` in App Control), non Sentry.** Gratis, integrata, privata, leggibile dall'agent. Sentry = fallback documentato con trigger preciso (§5).
