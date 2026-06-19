# Agent API — App Control

Documentazione dell'accesso diretto da agent esterni (Claude Code, automazioni).

## Come funziona

Ogni progetto in App Control ha un `projectId` e un `agentKey` univoci. Un agent esterno li usa come credenziali per leggere i dati del progetto e aggiornarne le variabili direttamente da Supabase, senza passare per il PIN.

## Credenziali necessarie

Il file `.agent/app-control.json` nella root di ogni progetto contiene:

```json
{
  "projectId": "nome-progetto",
  "agentKey": "XXXXX-XXXXX-XXXXX-XXXXX",
  "appControlSupabaseUrl": "https://xxx.supabase.co",
  "appControlSupabaseAnonKey": "eyJ..."
}
```

Viene generato automaticamente dal tab **Sync** in App Control e va copiato nella root del progetto. Va aggiunto al `.gitignore`.

## Headers da inviare

Ogni richiesta Supabase REST deve includere:

```
Authorization: Bearer <appControlSupabaseAnonKey>
apikey: <appControlSupabaseAnonKey>
x-app-control-project-id: <projectId>
x-app-control-agent-key: <agentKey>
```

## Dati leggibili

Con questi header l'agent può leggere (solo lettura, solo il proprio progetto):

- `projects` — metadati progetto (nome, URL deploy, stack, etc.)
- `project_env_variables` — tutte le variabili (GITHUB_TOKEN, SUPABASE_URL, etc.)
- `project_data_fields` — campi custom (email GitHub, password, etc.)
- `project_platform_accesses` — accessi piattaforme
- `project_agent_keys` — prompt sincronizzazione

## Esempio di chiamata

```bash
# Nessun filtro project_id nell'URL: e' la RLS a limitare al proprio progetto
# (projectId qui = slug del Sync; project_id colonna e' un UUID, non lo slug).
curl "https://xxx.supabase.co/rest/v1/project_env_variables?select=key,value_text" \
  -H "Authorization: Bearer <anonKey>" \
  -H "apikey: <anonKey>" \
  -H "x-app-control-project-id: <projectId>" \
  -H "x-app-control-agent-key: <agentKey>"
```

> `projectId` (header / JSON Sync) = **slug** = `projects.agent_project_id`. La colonna `project_id` delle tabelle figlie e' invece l'UUID interno (`projects.id`): non filtrarci lo slug nell'URL, darebbe errore `invalid input syntax for type uuid`. L'identificazione del progetto la fa la RLS combinando slug + agent key.

## Sicurezza

- L'agent key dà accesso al **proprio progetto soltanto** (lettura dati + scrittura su `project_env_variables`).
- Nessun altro progetto è accessibile con quella chiave.
- Scrittura consentita solo su `project_env_variables` del proprio progetto (vedi `DNA/06_APP_CONTROL_SYNC.md`); nessuna scrittura su altre tabelle.
- Il file `.agent/app-control.json` non va mai committato su GitHub.

## Attivazione

Per attivare questa funzione su un nuovo progetto Supabase di App Control, eseguire la migration:
`supabase/migrations/20260617_01_agent_key_access.sql`
