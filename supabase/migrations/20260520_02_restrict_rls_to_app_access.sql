-- Apply only after:
-- 1. the frontend version that sends x-app-control-pin-hash is deployed;
-- 2. external read-only integrations, including the Google Sheets backup, can send the same app-access header
--    or have been replaced by a safer authenticated/server-side path.
-- This migration does not modify application records, but it changes who can read/write them.

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

drop policy if exists app_control_settings_app_all on public.app_control_settings;
drop policy if exists app_control_settings_anon_all on public.app_control_settings;
drop policy if exists customers_app_all on public.customers;
drop policy if exists customer_projects_app_all on public.customer_projects;
drop policy if exists customer_project_data_fields_app_all on public.customer_project_data_fields;
drop policy if exists customer_project_env_variables_app_all on public.customer_project_env_variables;
drop policy if exists customer_project_platform_accesses_app_all on public.customer_project_platform_accesses;
drop policy if exists projects_app_all on public.projects;
drop policy if exists project_agent_keys_app_all on public.project_agent_keys;
drop policy if exists project_data_fields_app_all on public.project_data_fields;
drop policy if exists project_env_variables_app_all on public.project_env_variables;
drop policy if exists project_images_app_all on public.project_images;
drop policy if exists project_platform_accesses_app_all on public.project_platform_accesses;
drop policy if exists prompts_app_all on public.prompts;

create policy app_control_settings_app_access_all
on public.app_control_settings
for all
to anon, authenticated
using (public.app_control_request_is_authorized())
with check (true);

create policy customers_app_access_all
on public.customers
for all
to anon, authenticated
using (public.app_control_request_is_authorized())
with check (public.app_control_request_is_authorized());

create policy customer_projects_app_access_all
on public.customer_projects
for all
to anon, authenticated
using (public.app_control_request_is_authorized())
with check (public.app_control_request_is_authorized());

create policy customer_project_data_fields_app_access_all
on public.customer_project_data_fields
for all
to anon, authenticated
using (public.app_control_request_is_authorized())
with check (public.app_control_request_is_authorized());

create policy customer_project_env_variables_app_access_all
on public.customer_project_env_variables
for all
to anon, authenticated
using (public.app_control_request_is_authorized())
with check (public.app_control_request_is_authorized());

create policy customer_project_platform_accesses_app_access_all
on public.customer_project_platform_accesses
for all
to anon, authenticated
using (public.app_control_request_is_authorized())
with check (public.app_control_request_is_authorized());

create policy projects_app_access_all
on public.projects
for all
to anon, authenticated
using (public.app_control_request_is_authorized())
with check (public.app_control_request_is_authorized());

create policy project_agent_keys_app_access_all
on public.project_agent_keys
for all
to anon, authenticated
using (public.app_control_request_is_authorized())
with check (public.app_control_request_is_authorized());

create policy project_data_fields_app_access_all
on public.project_data_fields
for all
to anon, authenticated
using (public.app_control_request_is_authorized())
with check (public.app_control_request_is_authorized());

create policy project_env_variables_app_access_all
on public.project_env_variables
for all
to anon, authenticated
using (public.app_control_request_is_authorized())
with check (public.app_control_request_is_authorized());

create policy project_images_app_access_all
on public.project_images
for all
to anon, authenticated
using (public.app_control_request_is_authorized())
with check (public.app_control_request_is_authorized());

create policy project_platform_accesses_app_access_all
on public.project_platform_accesses
for all
to anon, authenticated
using (public.app_control_request_is_authorized())
with check (public.app_control_request_is_authorized());

create policy prompts_app_access_all
on public.prompts
for all
to anon, authenticated
using (public.app_control_request_is_authorized())
with check (public.app_control_request_is_authorized());
