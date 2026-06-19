-- Fix canale agent: le policy 20260617_01 e 20260618_01 confrontavano
-- projects.id (UUID interno) con l'header x-app-control-project-id, ma quell'header
-- porta lo SLUG del progetto (projects.agent_project_id), non l'id UUID.
-- Risultato: il confronto e' sempre falso -> ogni lettura/scrittura agent torna [].
--
-- Questa migration riallinea il match del canale agent su:
--   agent_project_id (slug)  +  agent key valida (project_agent_keys.key_ciphertext)
-- traducendo poi verso projects.id per le tabelle figlie.
--
-- Lo slug da solo NON e' garantito univoco (unique e' su (user_id, agent_project_id),
-- con user_id nullable), quindi l'identificazione sicura del progetto richiede
-- slug + agent key insieme. Per questo si usa una funzione helper che ritorna
-- l'id UUID del progetto autorizzato per la richiesta corrente.
--
-- Additiva e reversibile: sostituisce SOLO le policy del canale agent
-- (gli stessi nomi creati da 20260617_01 / 20260618_01). Non tocca dati, schema,
-- altre policy (PIN, backup, app) ne' la service_role (non usata dal canale agent).

-- 1) Helper: id UUID del progetto autorizzato per la richiesta corrente.
--    Richiede che slug dell'header E agent key combacino sulla stessa riga.
--    Ritorna NULL se non autorizzato (-> la policy nega l'accesso).
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

-- 2) Ricrea le policy del canale agent usando la traduzione slug+key -> id UUID.
--    Stessi nomi delle policy originali: questa migration le sostituisce in modo pulito.
do $$
begin
  -- projects: SELECT (match diretto sull'id tradotto)
  drop policy if exists projects_agent_select on public.projects;
  create policy projects_agent_select on public.projects
    for select to anon, authenticated
    using (id = public.app_control_request_authorized_project_uuid());

  -- project_env_variables: SELECT
  drop policy if exists project_env_variables_agent_select on public.project_env_variables;
  create policy project_env_variables_agent_select on public.project_env_variables
    for select to anon, authenticated
    using (project_id = public.app_control_request_authorized_project_uuid());

  -- project_env_variables: INSERT / UPDATE / DELETE (scrittura del solo proprio progetto)
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
