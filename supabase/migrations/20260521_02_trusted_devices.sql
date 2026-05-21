-- Add trusted-device access without persisting the PIN in the browser.
-- This migration changes schema, functions, policies and grants only. It does not modify application records.

create table if not exists public.app_control_trusted_devices (
  token_hash text primary key check (token_hash ~ '^[a-f0-9]{64}$'),
  device_label text,
  created_at timestamptz not null default now(),
  expires_at timestamptz not null default (now() + interval '90 days'),
  revoked_at timestamptz,
  last_verified_at timestamptz
);

alter table public.app_control_trusted_devices enable row level security;

revoke all on public.app_control_trusted_devices from anon, authenticated;

create or replace function public.app_control_device_token_is_valid(device_token text)
returns boolean
language sql
immutable
security definer
set search_path = public, pg_temp
as $$
  select device_token is not null
    and device_token ~ '^[A-Za-z0-9_-]{43,128}$';
$$;

create or replace function public.app_control_hash_device_token(device_token text)
returns text
language sql
immutable
security definer
set search_path = public, extensions, pg_temp
as $$
  select encode(extensions.digest(device_token, 'sha256'), 'hex');
$$;

create or replace function public.app_control_request_device_token()
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

  return nullif(request_headers ->> 'x-app-control-device-token', '');
end;
$$;

create or replace function public.app_control_verify_trusted_device(device_token text)
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select public.app_control_device_token_is_valid(device_token)
    and exists (
      select 1
      from public.app_control_trusted_devices
      where token_hash = public.app_control_hash_device_token(device_token)
        and revoked_at is null
        and expires_at > now()
    );
$$;

create or replace function public.app_control_request_trusted_device_is_authorized()
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select public.app_control_verify_trusted_device(public.app_control_request_device_token());
$$;

create or replace function public.app_control_request_is_authorized()
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select public.app_control_verify_pin(public.app_control_request_pin_hash())
    or public.app_control_request_trusted_device_is_authorized();
$$;

create or replace function public.app_control_create_trusted_device(
  current_pin_hash text,
  device_token text,
  device_label text default null
)
returns boolean
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  if not public.app_control_verify_pin(current_pin_hash) then
    return false;
  end if;

  if not public.app_control_device_token_is_valid(device_token) then
    return false;
  end if;

  insert into public.app_control_trusted_devices (
    token_hash,
    device_label,
    expires_at,
    revoked_at
  )
  values (
    public.app_control_hash_device_token(device_token),
    nullif(left(coalesce(device_label, ''), 120), ''),
    now() + interval '90 days',
    null
  )
  on conflict (token_hash)
  do update set
    device_label = excluded.device_label,
    expires_at = excluded.expires_at,
    revoked_at = null;

  return true;
end;
$$;

create or replace function public.app_control_revoke_trusted_device(device_token text)
returns boolean
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  if not public.app_control_device_token_is_valid(device_token) then
    return false;
  end if;

  update public.app_control_trusted_devices
  set revoked_at = now()
  where token_hash = public.app_control_hash_device_token(device_token)
    and revoked_at is null;

  return found;
end;
$$;

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

  update public.app_control_trusted_devices
  set revoked_at = now()
  where revoked_at is null;

  return true;
end;
$$;

revoke all on function public.app_control_device_token_is_valid(text) from public;
revoke all on function public.app_control_hash_device_token(text) from public;
revoke all on function public.app_control_request_device_token() from public;
revoke all on function public.app_control_verify_trusted_device(text) from public;
revoke all on function public.app_control_request_trusted_device_is_authorized() from public;
revoke all on function public.app_control_create_trusted_device(text, text, text) from public;
revoke all on function public.app_control_revoke_trusted_device(text) from public;

grant execute on function public.app_control_request_device_token() to anon, authenticated;
grant execute on function public.app_control_verify_trusted_device(text) to anon, authenticated;
grant execute on function public.app_control_request_trusted_device_is_authorized() to anon, authenticated;
grant execute on function public.app_control_create_trusted_device(text, text, text) to anon, authenticated;
grant execute on function public.app_control_revoke_trusted_device(text) to anon, authenticated;
