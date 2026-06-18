-- Agent write access for Claude Code and other external agents.
-- Extends the read-only agent channel (20260617_01) with project-scoped
-- write access on project_env_variables ONLY.
--
-- Reuses the existing verification functions from 20260617_01:
--   public.app_control_request_project_id()
--   public.app_control_request_is_agent_authorized_for_project(text)
--
-- Additive and reversible: only adds policies, never touches data, schema,
-- existing policies, or other tables. An agent key can write only its own
-- project's variables, nothing else.

do $$
declare
  policy_name text;
begin
  -- INSERT new variables for the agent's own project
  policy_name := 'project_env_variables_agent_insert';
  execute format('drop policy if exists %I on public.project_env_variables', policy_name);
  execute format(
    'create policy %I on public.project_env_variables for insert to anon, authenticated with check (
      project_id::text = public.app_control_request_project_id()
      and public.app_control_request_is_agent_authorized_for_project(project_id::text)
    )',
    policy_name
  );

  -- UPDATE existing variables for the agent's own project
  policy_name := 'project_env_variables_agent_update';
  execute format('drop policy if exists %I on public.project_env_variables', policy_name);
  execute format(
    'create policy %I on public.project_env_variables for update to anon, authenticated using (
      project_id::text = public.app_control_request_project_id()
      and public.app_control_request_is_agent_authorized_for_project(project_id::text)
    ) with check (
      project_id::text = public.app_control_request_project_id()
      and public.app_control_request_is_agent_authorized_for_project(project_id::text)
    )',
    policy_name
  );

  -- DELETE obsolete variables for the agent's own project
  policy_name := 'project_env_variables_agent_delete';
  execute format('drop policy if exists %I on public.project_env_variables', policy_name);
  execute format(
    'create policy %I on public.project_env_variables for delete to anon, authenticated using (
      project_id::text = public.app_control_request_project_id()
      and public.app_control_request_is_agent_authorized_for_project(project_id::text)
    )',
    policy_name
  );
end $$;
