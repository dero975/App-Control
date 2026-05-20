create or replace function public.app_control_verify_pin(candidate_pin_hash text)
returns boolean
language sql
security definer
set search_path = public, pg_temp
as $$
  select exists (
    select 1
    from public.app_control_settings
    where id = true
      and pin_hash = candidate_pin_hash
  );
$$;

create or replace function public.app_control_request_pin_hash()
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

  return nullif(request_headers ->> 'x-app-control-pin-hash', '');
end;
$$;

create or replace function public.app_control_request_is_authorized()
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select public.app_control_verify_pin(public.app_control_request_pin_hash());
$$;

revoke all on function public.app_control_verify_pin(text) from public;
revoke all on function public.app_control_request_pin_hash() from public;
revoke all on function public.app_control_request_is_authorized() from public;

grant execute on function public.app_control_verify_pin(text) to anon, authenticated;
grant execute on function public.app_control_request_pin_hash() to anon, authenticated;
grant execute on function public.app_control_request_is_authorized() to anon, authenticated;
