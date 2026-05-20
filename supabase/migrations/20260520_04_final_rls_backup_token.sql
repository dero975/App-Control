-- Final RLS hardening after Google Apps Script can send x-app-control-backup-token.
-- This migration changes only functions, policies and grants. It does not modify application records.

create or replace function public.app_control_request_backup_token()
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

  return nullif(request_headers ->> 'x-app-control-backup-token', '');
end;
$$;

create or replace function public.app_control_request_is_backup_authorized()
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select public.app_control_request_backup_token() is not null
    and encode(extensions.digest(public.app_control_request_backup_token(), 'sha256'), 'hex') =
      'bf7c6417d6611e3c80839421404f9622156790be0d7421aeea1ab108d5b29b80';
$$;

revoke all on function public.app_control_request_backup_token() from public;
revoke all on function public.app_control_request_is_backup_authorized() from public;
grant execute on function public.app_control_request_backup_token() to anon, authenticated;
grant execute on function public.app_control_request_is_backup_authorized() to anon, authenticated;

revoke truncate, references, trigger on
  public.app_control_settings,
  public.customers,
  public.customer_projects,
  public.customer_project_data_fields,
  public.customer_project_env_variables,
  public.customer_project_platform_accesses,
  public.projects,
  public.project_agent_keys,
  public.project_data_fields,
  public.project_env_variables,
  public.project_images,
  public.project_platform_accesses,
  public.prompts
from anon, authenticated;

revoke all on
  public.customer_domain_healthcheck,
  public.customer_project_details_export,
  public.customer_projects_diagnostics,
  public.customer_projects_export_flat,
  public.customer_projects_overview
from anon, authenticated;

revoke all on function public.customer_domain_counts() from anon, authenticated;
revoke all on function public.customer_domain_snapshot() from anon, authenticated;

do $$
declare
  target_table text;
  policy_record record;
  app_only_tables text[] := array[
    'customers',
    'customer_projects',
    'customer_project_data_fields',
    'customer_project_env_variables',
    'customer_project_platform_accesses',
    'project_agent_keys',
    'project_data_fields',
    'project_images',
    'project_platform_accesses'
  ];
  backup_read_tables text[] := array[
    'projects',
    'project_env_variables',
    'prompts'
  ];
begin
  for policy_record in
    select tablename, policyname
    from pg_policies
    where schemaname = 'public'
      and tablename = any (
        array[
          'app_control_settings',
          'customers',
          'customer_projects',
          'customer_project_data_fields',
          'customer_project_env_variables',
          'customer_project_platform_accesses',
          'projects',
          'project_agent_keys',
          'project_data_fields',
          'project_env_variables',
          'project_images',
          'project_platform_accesses',
          'prompts'
        ]
      )
  loop
    execute format('drop policy if exists %I on public.%I', policy_record.policyname, policy_record.tablename);
  end loop;

  execute 'create policy app_control_settings_app_update on public.app_control_settings for update to anon, authenticated using (public.app_control_request_is_authorized()) with check (true)';

  foreach target_table in array app_only_tables
  loop
    execute format('create policy %I on public.%I for select to anon, authenticated using (public.app_control_request_is_authorized())', target_table || '_app_select', target_table);
    execute format('create policy %I on public.%I for insert to anon, authenticated with check (public.app_control_request_is_authorized())', target_table || '_app_insert', target_table);
    execute format('create policy %I on public.%I for update to anon, authenticated using (public.app_control_request_is_authorized()) with check (public.app_control_request_is_authorized())', target_table || '_app_update', target_table);
    execute format('create policy %I on public.%I for delete to anon, authenticated using (public.app_control_request_is_authorized())', target_table || '_app_delete', target_table);
  end loop;

  foreach target_table in array backup_read_tables
  loop
    execute format('create policy %I on public.%I for select to anon, authenticated using (public.app_control_request_is_authorized() or public.app_control_request_is_backup_authorized())', target_table || '_app_or_backup_select', target_table);
    execute format('create policy %I on public.%I for insert to anon, authenticated with check (public.app_control_request_is_authorized())', target_table || '_app_insert', target_table);
    execute format('create policy %I on public.%I for update to anon, authenticated using (public.app_control_request_is_authorized()) with check (public.app_control_request_is_authorized())', target_table || '_app_update', target_table);
    execute format('create policy %I on public.%I for delete to anon, authenticated using (public.app_control_request_is_authorized())', target_table || '_app_delete', target_table);
  end loop;
end $$;
