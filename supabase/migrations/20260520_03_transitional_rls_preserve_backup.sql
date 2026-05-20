-- Transitional hardening while the external Google Sheets backup still reads Supabase REST directly
-- with SUPABASE_URL and SUPABASE_ANON_KEY.
--
-- This migration does not modify application records.
-- It removes permissive write policies and keeps anonymous read access only for the tables
-- currently needed by the documented read-only backup: projects, project_env_variables and prompts.
-- Apply the stricter migration after the backup can send x-app-control-pin-hash or moves server-side.

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
drop policy if exists app_control_settings_app_access_all on public.app_control_settings;
drop policy if exists app_control_settings_app_access_update on public.app_control_settings;

drop policy if exists customers_app_all on public.customers;
drop policy if exists customers_app_access_all on public.customers;
drop policy if exists customers_app_access_select on public.customers;
drop policy if exists customers_app_access_insert on public.customers;
drop policy if exists customers_app_access_update on public.customers;
drop policy if exists customers_app_access_delete on public.customers;

drop policy if exists customer_projects_app_all on public.customer_projects;
drop policy if exists customer_projects_app_access_all on public.customer_projects;
drop policy if exists customer_projects_app_access_select on public.customer_projects;
drop policy if exists customer_projects_app_access_insert on public.customer_projects;
drop policy if exists customer_projects_app_access_update on public.customer_projects;
drop policy if exists customer_projects_app_access_delete on public.customer_projects;

drop policy if exists customer_project_data_fields_app_all on public.customer_project_data_fields;
drop policy if exists customer_project_data_fields_app_access_all on public.customer_project_data_fields;
drop policy if exists customer_project_data_fields_app_access_select on public.customer_project_data_fields;
drop policy if exists customer_project_data_fields_app_access_insert on public.customer_project_data_fields;
drop policy if exists customer_project_data_fields_app_access_update on public.customer_project_data_fields;
drop policy if exists customer_project_data_fields_app_access_delete on public.customer_project_data_fields;

drop policy if exists customer_project_env_variables_app_all on public.customer_project_env_variables;
drop policy if exists customer_project_env_variables_app_access_all on public.customer_project_env_variables;
drop policy if exists customer_project_env_variables_app_access_select on public.customer_project_env_variables;
drop policy if exists customer_project_env_variables_app_access_insert on public.customer_project_env_variables;
drop policy if exists customer_project_env_variables_app_access_update on public.customer_project_env_variables;
drop policy if exists customer_project_env_variables_app_access_delete on public.customer_project_env_variables;

drop policy if exists customer_project_platform_accesses_app_all on public.customer_project_platform_accesses;
drop policy if exists customer_project_platform_accesses_app_access_all on public.customer_project_platform_accesses;
drop policy if exists customer_project_platform_accesses_app_access_select on public.customer_project_platform_accesses;
drop policy if exists customer_project_platform_accesses_app_access_insert on public.customer_project_platform_accesses;
drop policy if exists customer_project_platform_accesses_app_access_update on public.customer_project_platform_accesses;
drop policy if exists customer_project_platform_accesses_app_access_delete on public.customer_project_platform_accesses;

drop policy if exists projects_app_all on public.projects;
drop policy if exists projects_app_access_all on public.projects;
drop policy if exists projects_backup_select on public.projects;
drop policy if exists projects_app_access_insert on public.projects;
drop policy if exists projects_app_access_update on public.projects;
drop policy if exists projects_app_access_delete on public.projects;

drop policy if exists project_env_variables_app_all on public.project_env_variables;
drop policy if exists project_env_variables_app_access_all on public.project_env_variables;
drop policy if exists project_env_variables_backup_select on public.project_env_variables;
drop policy if exists project_env_variables_app_access_insert on public.project_env_variables;
drop policy if exists project_env_variables_app_access_update on public.project_env_variables;
drop policy if exists project_env_variables_app_access_delete on public.project_env_variables;

drop policy if exists prompts_app_all on public.prompts;
drop policy if exists prompts_app_access_all on public.prompts;
drop policy if exists prompts_backup_select on public.prompts;
drop policy if exists prompts_app_access_insert on public.prompts;
drop policy if exists prompts_app_access_update on public.prompts;
drop policy if exists prompts_app_access_delete on public.prompts;

drop policy if exists project_agent_keys_app_all on public.project_agent_keys;
drop policy if exists project_agent_keys_app_access_all on public.project_agent_keys;
drop policy if exists project_agent_keys_app_access_select on public.project_agent_keys;
drop policy if exists project_agent_keys_app_access_insert on public.project_agent_keys;
drop policy if exists project_agent_keys_app_access_update on public.project_agent_keys;
drop policy if exists project_agent_keys_app_access_delete on public.project_agent_keys;

drop policy if exists project_data_fields_app_all on public.project_data_fields;
drop policy if exists project_data_fields_app_access_all on public.project_data_fields;
drop policy if exists project_data_fields_app_access_select on public.project_data_fields;
drop policy if exists project_data_fields_app_access_insert on public.project_data_fields;
drop policy if exists project_data_fields_app_access_update on public.project_data_fields;
drop policy if exists project_data_fields_app_access_delete on public.project_data_fields;

drop policy if exists project_images_app_all on public.project_images;
drop policy if exists project_images_app_access_all on public.project_images;
drop policy if exists project_images_app_access_select on public.project_images;
drop policy if exists project_images_app_access_insert on public.project_images;
drop policy if exists project_images_app_access_update on public.project_images;
drop policy if exists project_images_app_access_delete on public.project_images;

drop policy if exists project_platform_accesses_app_all on public.project_platform_accesses;
drop policy if exists project_platform_accesses_app_access_all on public.project_platform_accesses;
drop policy if exists project_platform_accesses_app_access_select on public.project_platform_accesses;
drop policy if exists project_platform_accesses_app_access_insert on public.project_platform_accesses;
drop policy if exists project_platform_accesses_app_access_update on public.project_platform_accesses;
drop policy if exists project_platform_accesses_app_access_delete on public.project_platform_accesses;

create policy app_control_settings_app_access_update
on public.app_control_settings
for update
to anon, authenticated
using (public.app_control_request_is_authorized())
with check (true);

create policy projects_backup_select
on public.projects
for select
to anon, authenticated
using (true);

create policy project_env_variables_backup_select
on public.project_env_variables
for select
to anon, authenticated
using (true);

create policy prompts_backup_select
on public.prompts
for select
to anon, authenticated
using (true);

create policy projects_app_access_insert on public.projects for insert to anon, authenticated with check (public.app_control_request_is_authorized());
create policy projects_app_access_update on public.projects for update to anon, authenticated using (public.app_control_request_is_authorized()) with check (public.app_control_request_is_authorized());
create policy projects_app_access_delete on public.projects for delete to anon, authenticated using (public.app_control_request_is_authorized());

create policy project_env_variables_app_access_insert on public.project_env_variables for insert to anon, authenticated with check (public.app_control_request_is_authorized());
create policy project_env_variables_app_access_update on public.project_env_variables for update to anon, authenticated using (public.app_control_request_is_authorized()) with check (public.app_control_request_is_authorized());
create policy project_env_variables_app_access_delete on public.project_env_variables for delete to anon, authenticated using (public.app_control_request_is_authorized());

create policy prompts_app_access_insert on public.prompts for insert to anon, authenticated with check (public.app_control_request_is_authorized());
create policy prompts_app_access_update on public.prompts for update to anon, authenticated using (public.app_control_request_is_authorized()) with check (public.app_control_request_is_authorized());
create policy prompts_app_access_delete on public.prompts for delete to anon, authenticated using (public.app_control_request_is_authorized());

create policy customers_app_access_select on public.customers for select to anon, authenticated using (public.app_control_request_is_authorized());
create policy customers_app_access_insert on public.customers for insert to anon, authenticated with check (public.app_control_request_is_authorized());
create policy customers_app_access_update on public.customers for update to anon, authenticated using (public.app_control_request_is_authorized()) with check (public.app_control_request_is_authorized());
create policy customers_app_access_delete on public.customers for delete to anon, authenticated using (public.app_control_request_is_authorized());

create policy customer_projects_app_access_select on public.customer_projects for select to anon, authenticated using (public.app_control_request_is_authorized());
create policy customer_projects_app_access_insert on public.customer_projects for insert to anon, authenticated with check (public.app_control_request_is_authorized());
create policy customer_projects_app_access_update on public.customer_projects for update to anon, authenticated using (public.app_control_request_is_authorized()) with check (public.app_control_request_is_authorized());
create policy customer_projects_app_access_delete on public.customer_projects for delete to anon, authenticated using (public.app_control_request_is_authorized());

create policy customer_project_data_fields_app_access_select on public.customer_project_data_fields for select to anon, authenticated using (public.app_control_request_is_authorized());
create policy customer_project_data_fields_app_access_insert on public.customer_project_data_fields for insert to anon, authenticated with check (public.app_control_request_is_authorized());
create policy customer_project_data_fields_app_access_update on public.customer_project_data_fields for update to anon, authenticated using (public.app_control_request_is_authorized()) with check (public.app_control_request_is_authorized());
create policy customer_project_data_fields_app_access_delete on public.customer_project_data_fields for delete to anon, authenticated using (public.app_control_request_is_authorized());

create policy customer_project_env_variables_app_access_select on public.customer_project_env_variables for select to anon, authenticated using (public.app_control_request_is_authorized());
create policy customer_project_env_variables_app_access_insert on public.customer_project_env_variables for insert to anon, authenticated with check (public.app_control_request_is_authorized());
create policy customer_project_env_variables_app_access_update on public.customer_project_env_variables for update to anon, authenticated using (public.app_control_request_is_authorized()) with check (public.app_control_request_is_authorized());
create policy customer_project_env_variables_app_access_delete on public.customer_project_env_variables for delete to anon, authenticated using (public.app_control_request_is_authorized());

create policy customer_project_platform_accesses_app_access_select on public.customer_project_platform_accesses for select to anon, authenticated using (public.app_control_request_is_authorized());
create policy customer_project_platform_accesses_app_access_insert on public.customer_project_platform_accesses for insert to anon, authenticated with check (public.app_control_request_is_authorized());
create policy customer_project_platform_accesses_app_access_update on public.customer_project_platform_accesses for update to anon, authenticated using (public.app_control_request_is_authorized()) with check (public.app_control_request_is_authorized());
create policy customer_project_platform_accesses_app_access_delete on public.customer_project_platform_accesses for delete to anon, authenticated using (public.app_control_request_is_authorized());

create policy project_agent_keys_app_access_select on public.project_agent_keys for select to anon, authenticated using (public.app_control_request_is_authorized());
create policy project_agent_keys_app_access_insert on public.project_agent_keys for insert to anon, authenticated with check (public.app_control_request_is_authorized());
create policy project_agent_keys_app_access_update on public.project_agent_keys for update to anon, authenticated using (public.app_control_request_is_authorized()) with check (public.app_control_request_is_authorized());
create policy project_agent_keys_app_access_delete on public.project_agent_keys for delete to anon, authenticated using (public.app_control_request_is_authorized());

create policy project_data_fields_app_access_select on public.project_data_fields for select to anon, authenticated using (public.app_control_request_is_authorized());
create policy project_data_fields_app_access_insert on public.project_data_fields for insert to anon, authenticated with check (public.app_control_request_is_authorized());
create policy project_data_fields_app_access_update on public.project_data_fields for update to anon, authenticated using (public.app_control_request_is_authorized()) with check (public.app_control_request_is_authorized());
create policy project_data_fields_app_access_delete on public.project_data_fields for delete to anon, authenticated using (public.app_control_request_is_authorized());

create policy project_images_app_access_select on public.project_images for select to anon, authenticated using (public.app_control_request_is_authorized());
create policy project_images_app_access_insert on public.project_images for insert to anon, authenticated with check (public.app_control_request_is_authorized());
create policy project_images_app_access_update on public.project_images for update to anon, authenticated using (public.app_control_request_is_authorized()) with check (public.app_control_request_is_authorized());
create policy project_images_app_access_delete on public.project_images for delete to anon, authenticated using (public.app_control_request_is_authorized());

create policy project_platform_accesses_app_access_select on public.project_platform_accesses for select to anon, authenticated using (public.app_control_request_is_authorized());
create policy project_platform_accesses_app_access_insert on public.project_platform_accesses for insert to anon, authenticated with check (public.app_control_request_is_authorized());
create policy project_platform_accesses_app_access_update on public.project_platform_accesses for update to anon, authenticated using (public.app_control_request_is_authorized()) with check (public.app_control_request_is_authorized());
create policy project_platform_accesses_app_access_delete on public.project_platform_accesses for delete to anon, authenticated using (public.app_control_request_is_authorized());
