-- Agent key access for Claude Code and other external agents.
-- Adds read-only, project-scoped API access via x-app-control-agent-key header.
-- Does not modify existing policies, tables or application records.

-- 1. Read x-app-control-project-id from request headers
create or replace function public.app_control_request_project_id()
returns text
language plpgsql
stable
security definer
set search_path = public, pg_temp
as $$
declare
  request_headers jsonb;
begin
  begin
    request_headers := nullif(current_setting('request.headers', true), '')::jsonb;
  exception
    when others then
      return null;
  end;
  return nullif(request_headers ->> 'x-app-control-project-id', '');
end;
$$;

-- 2. Read x-app-control-agent-key from request headers
create or replace function public.app_control_request_agent_key()
returns text
language plpgsql
stable
security definer
set search_path = public, pg_temp
as $$
declare
  request_headers jsonb;
begin
  begin
    request_headers := nullif(current_setting('request.headers', true), '')::jsonb;
  exception
    when others then
      return null;
  end;
  return nullif(request_headers ->> 'x-app-control-agent-key', '');
end;
$$;

-- 3. Validate agent key against project_agent_keys table
create or replace function public.app_control_verify_agent_key(
  p_project_id text,
  p_agent_key text
)
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select
    p_project_id is not null
    and p_agent_key is not null
    and length(p_agent_key) >= 19
    and exists (
      select 1
      from public.project_agent_keys
      where project_id::text = p_project_id
        and key_ciphertext = p_agent_key
    );
$$;

-- 4. Check if current request is authorized as agent for a specific project
create or replace function public.app_control_request_is_agent_authorized_for_project(
  p_project_id text
)
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select public.app_control_verify_agent_key(
    p_project_id,
    public.app_control_request_agent_key()
  );
$$;

-- Grant execution
revoke all on function public.app_control_request_project_id() from public;
revoke all on function public.app_control_request_agent_key() from public;
revoke all on function public.app_control_verify_agent_key(text, text) from public;
revoke all on function public.app_control_request_is_agent_authorized_for_project(text) from public;

grant execute on function public.app_control_request_project_id() to anon, authenticated;
grant execute on function public.app_control_request_agent_key() to anon, authenticated;
grant execute on function public.app_control_verify_agent_key(text, text) to anon, authenticated;
grant execute on function public.app_control_request_is_agent_authorized_for_project(text) to anon, authenticated;

-- 5. Add agent read-only policies (project-scoped, alongside existing policies)
do $$
declare
  policy_name text;
begin
  -- projects table: read project metadata
  policy_name := 'projects_agent_select';
  execute format('drop policy if exists %I on public.projects', policy_name);
  execute format(
    'create policy %I on public.projects for select to anon, authenticated using (
      id::text = public.app_control_request_project_id()
      and public.app_control_request_is_agent_authorized_for_project(id::text)
    )',
    policy_name
  );

  -- project_env_variables: read env vars
  policy_name := 'project_env_variables_agent_select';
  execute format('drop policy if exists %I on public.project_env_variables', policy_name);
  execute format(
    'create policy %I on public.project_env_variables for select to anon, authenticated using (
      project_id::text = public.app_control_request_project_id()
      and public.app_control_request_is_agent_authorized_for_project(project_id::text)
    )',
    policy_name
  );

  -- project_data_fields: read custom fields (GitHub email, platform passwords, etc.)
  policy_name := 'project_data_fields_agent_select';
  execute format('drop policy if exists %I on public.project_data_fields', policy_name);
  execute format(
    'create policy %I on public.project_data_fields for select to anon, authenticated using (
      project_id::text = public.app_control_request_project_id()
      and public.app_control_request_is_agent_authorized_for_project(project_id::text)
    )',
    policy_name
  );

  -- project_platform_accesses: read platform access entries
  policy_name := 'project_platform_accesses_agent_select';
  execute format('drop policy if exists %I on public.project_platform_accesses', policy_name);
  execute format(
    'create policy %I on public.project_platform_accesses for select to anon, authenticated using (
      project_id::text = public.app_control_request_project_id()
      and public.app_control_request_is_agent_authorized_for_project(project_id::text)
    )',
    policy_name
  );

  -- project_agent_keys: read sync prompt
  policy_name := 'project_agent_keys_agent_select';
  execute format('drop policy if exists %I on public.project_agent_keys', policy_name);
  execute format(
    'create policy %I on public.project_agent_keys for select to anon, authenticated using (
      project_id::text = public.app_control_request_project_id()
      and public.app_control_request_is_agent_authorized_for_project(project_id::text)
    )',
    policy_name
  );
end $$;
