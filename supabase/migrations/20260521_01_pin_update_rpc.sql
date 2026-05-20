-- Harden PIN rotation by moving app_control_settings writes behind a dedicated RPC.
-- This migration changes only functions, policies and grants. It does not modify application records.

create or replace function public.app_control_update_pin(current_pin_hash text, next_pin_hash text)
returns boolean
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  if current_pin_hash is null
    or next_pin_hash is null
    or current_pin_hash !~ '^[a-f0-9]{64}$'
    or next_pin_hash !~ '^[a-f0-9]{64}$'
  then
    return false;
  end if;

  if not public.app_control_verify_pin(current_pin_hash) then
    return false;
  end if;

  update public.app_control_settings
  set pin_hash = next_pin_hash
  where id = true;

  return true;
end;
$$;

revoke all on function public.app_control_update_pin(text, text) from public;
grant execute on function public.app_control_update_pin(text, text) to anon, authenticated;

revoke select, insert, update, delete on public.app_control_settings from anon, authenticated;

drop policy if exists app_control_settings_app_update on public.app_control_settings;
