# 04 - Supabase Schema And SQL

Documento canonico per lo schema Supabase target. Deve restare coerente con il codice reale prima di eseguire script in SQL Editor.

Stato attuale del codice: Supabase e collegato per PIN app e sezioni Progetti/Prompt/Clienti tramite client frontend anon. Gli script qui sotto descrivono lo schema attivo/target e gli aggiornamenti incrementali.

Stato setup Supabase eseguito nella fase corrente:

- create le tabelle `projects`, `project_data_fields`, `project_platform_accesses`, `project_env_variables`, `project_images`, `project_agent_keys`;
- create anche le tabelle `customers`, `customer_projects`, `customer_project_platform_accesses`, `customer_project_env_variables`, `customer_project_data_fields`;
- attivati trigger `set_updated_at`;
- RLS attiva; le policy owner iniziali sono state sostituite dalla fase PIN con policy permissive anon/auth per le tabelle operative;
- creata tabella `app_control_settings` per PIN sincronizzato;
- la sezione `Prompt` usa ora la tabella reale `prompts` con persistenza completa create/read/update/delete;
- il dominio `Clienti` ha anche viste/funzioni operative: `customer_projects_overview`, `customer_projects_diagnostics`, `customer_projects_export_flat`, `customer_project_details_export`, `customer_domain_healthcheck`, `customer_domain_counts()`, `customer_domain_snapshot()`;
- non creare `project_prompts` o `app_settings`: non esistono piu esigenze runtime coerenti con quelle tabelle nel codice attuale.

## Regole prima di eseguire SQL

- Eseguire gli script in ordine, uno alla volta.
- Dopo ogni script, verificare l'esito prima di procedere.
- Non inserire dati reali o segreti nel SQL Editor.
- Password, token, chiavi Supabase, DB URL e blocchi ENV devono essere salvati come ciphertext o placeholder fino a quando non esiste cifratura applicativa.
- Non usare mai `SUPABASE_SERVICE_ROLE_KEY` nel frontend.
- Se il codice cambia modello dati o flussi, aggiornare questo file prima di creare o modificare tabelle.

## Mappatura codice -> database

Fonte codice primaria:

- Tipi: `src/types/app.ts`
- Progetti e tab: `src/features/projects/ProjectsPage.tsx`
- ENV e `.env render`: `src/features/projects/ProjectsPage.tsx`
- Prompt: `src/features/prompts`
- Clienti: `src/features/customers`

Mappatura:

- Lista progetti e header dettaglio: `projects`.
- `created_at` alimenta la `Data creazione` del dettaglio; `updated_at` alimenta `Ultima modifica` nella lista progetti.
- JSON sync progetto: `projects.agent_project_id` piu `project_agent_keys`.
- Preview progetto `sviluppo in / deploy con`: `projects.development_environment` e `projects.deploy_provider`.
- Tab `Dati progetto`:
  - `nome progetto`: `projects.name`
  - `mail github`: `projects.github_account_email`
  - `Password`: `projects.linked_secret_label_ciphertext`
  - `sviluppo in`: `projects.development_environment`
  - accessi piattaforme dentro `sviluppo in`: `project_platform_accesses`
  - `deploy con`: `projects.deploy_provider`
  - campi aggiunti manualmente: `project_data_fields`
- Tab `Variabili`: `project_env_variables`.
- Set canonico variabili progetto atteso in App Control: `LINK_DEPLOY`, `GITHUB_URL`, `GITHUB_TOKEN`, `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `DATABASE_URL`.
- `LINK_DEPLOY ADMIN` e `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`, `SUPABASE_DB_URL` non sono piu input canonici da compilare in App Control: vanno derivate quando richieste dal codice reale o dal provider target.
- Tab `Immagini`: `project_images`; la UI mostra sempre cinque slot fissi e salva `slot_id`, `name`, `fileName`, `mimeType`, `dataUrl`, `sizeBytes`, `originalSizeBytes`.
- Persistenza immagini attuale: salvare il data URL ottimizzato nella colonna `data_url`; `path` resta disponibile per un futuro passaggio a Supabase Storage.
- Tab `Note`: target dati `projects.operational_notes`; il repository corrente persiste gli update tramite il normale autosave del dettaglio progetto.
- Tab `Sync`: `project_agent_keys`; la UI mostra prompt generico stabile e JSON `.agent/app-control.json` specifico del progetto.
- Prompt library: `prompts`; non esiste relazione corrente `project_prompts`.
- Workspace `Clienti`: `customers`, `customer_projects`, `customer_project_platform_accesses`, `customer_project_env_variables`, `customer_project_data_fields`.
- In `customers`, il nome visualizzato UI e derivato da `first_name + last_name`, con fallback su `company`, mentre `name` resta il campo canonico salvato e ricostruito dal frontend per compatibilita operativa e ricerca.
- Impostazioni placeholder: `app_settings`, esclusa dalla fase corrente.
- PIN app: `app_control_settings`.

## Decisioni schema

- `text` al posto di enum per piattaforme e provider, per supportare `+ Aggiungi`.
- `status`, `scope`, `type` e `category` hanno check constraint per i valori attuali del codice.
- RLS attiva su tutte le tabelle dati.
- Dopo la fase PIN, l'app usa client anon e policy permissive `*_app_all`; `projects.user_id` resta nullable per non dipendere da Supabase Auth.
- La futura tabella `prompts` deve seguire lo stesso modello operativo della fase PIN: nessuna dipendenza da `auth.users`, nessun `user_id` obbligatorio e policy permissive `anon/auth` coerenti con il resto dell'app privata.
- Nel database reale verificato, `projects.agent_project_id` non e unique globale: il vincolo e `unique (user_id, agent_project_id)`. Con `user_id` nullable, gli script demo non devono usare `on conflict (agent_project_id)`.
- Il PIN app e salvato come hash in `app_control_settings`; non sostituisce cifratura dei segreti.
- Le colonne `*_ciphertext` non cifrano da sole: indicano dati da cifrare lato applicazione prima della persistenza.
- Le password piattaforma sono visibili in UI per richiesta funzionale, ma devono essere cifrate at-rest.
- Le Agent Key devono essere generate da App Control nel formato `XXXXX-XXXXX-XXXXX-XXXXX`.
- Il prompt di sincronizzazione resta generico; `projectId` e `agentKey` stanno nel JSON per progetto. Il prompt deve anche istruire l'agent a derivare automaticamente le variabili `VITE_SUPABASE_*` da `SUPABASE_*` quando il progetto usa Vite e a trattare `SUPABASE_DB_URL` come alias di `DATABASE_URL` solo quando richiesto.
- Se l'app o il progetto esterno richiede un link admin dedicato, `LINK_DEPLOY ADMIN` va trattata come variabile derivata di `LINK_DEPLOY` con default `${LINK_DEPLOY}/admina`, sovrascrivibile manualmente senza perdere il fallback automatico.
- Le Agent Key non devono essere salvate solo in chiaro: target consigliato `key_hash` per verifica e `key_ciphertext` solo se l'app deve poterle mostrare.
- `project_images.slot_id` identifica lo slot funzionale; `name` e il titolo visibile/download.
- `project_images.data_url` conserva l'anteprima/file ottimizzato per ripristino dopo refresh; non inserire immagini non ottimizzate o superiori al limite operativo UI.
- Il nome download immagine si calcola dal titolo card e dall'estensione reale, non va salvato come dato canonico.
- Gli slot immagine fissi sono sempre renderizzati dalla UI anche quando non esistono record immagine persistiti.
- Il modello dati reale dei prompt concluso in UI e minimale: `title`, `category`, `full_text`, `sort_order`, `created_at`, `updated_at`.
- Le categorie canoniche prompt sono solo `Prompt iniziali`, `Prompt manutenzione`, `Prompt vari`.
- Non usare nello schema prompt campi legacy non presenti nel codice reale: `type`, `usage_notes`, `tags`, `favorite`, `last_modified`.
- Non usare una relazione `project_prompts`: oggi i prompt non sono collegati a singoli progetti.
- La pagina `Impostazioni` usa solo `app_control_settings` per il PIN; non creare `app_settings`.

## Tabelle target

- `projects`
- `project_data_fields`
- `project_platform_accesses`
- `project_env_variables`
- `project_images`
- `project_agent_keys`
- `customers`
- colonne operative attese: `name`, `first_name`, `last_name`, `company`, `email`, `development_email`, `password_ciphertext`, `notes`
- `customer_projects`
- `customer_project_platform_accesses`
- `customer_project_env_variables`
- `customer_project_data_fields`
- `app_control_settings`
- `prompts`

Tabelle future non attive nella fase corrente:

- `project_prompts`
- `app_settings`

## Script 0B - PIN app e policy senza Supabase Auth

Eseguire dopo avere corretto `VITE_SUPABASE_ANON_KEY`. Lo script rimuove la dipendenza da login email/password per la sezione Progetti, crea la tabella PIN e consente al client anon di leggere/scrivere le tabelle operative dell'app.

```sql
create table if not exists public.app_control_settings (
  id boolean primary key default true check (id),
  pin_hash text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

insert into public.app_control_settings (id, pin_hash)
values (true, '8c75a9caf68bf332df5bf3714dcfd4e9d1b5088b42f0cffec88ee78df3670977')
on conflict (id) do nothing;

drop trigger if exists app_control_settings_set_updated_at on public.app_control_settings;
create trigger app_control_settings_set_updated_at
before update on public.app_control_settings
for each row execute function public.set_updated_at();

alter table public.projects
alter column user_id drop not null;

alter table public.projects enable row level security;
alter table public.project_data_fields enable row level security;
alter table public.project_platform_accesses enable row level security;
alter table public.project_env_variables enable row level security;
alter table public.project_images enable row level security;
alter table public.project_agent_keys enable row level security;
alter table public.app_control_settings enable row level security;

drop policy if exists projects_owner_all on public.projects;
drop policy if exists project_data_fields_owner_all on public.project_data_fields;
drop policy if exists project_platform_accesses_owner_all on public.project_platform_accesses;
drop policy if exists project_env_variables_owner_all on public.project_env_variables;
drop policy if exists project_images_owner_all on public.project_images;
drop policy if exists project_agent_keys_owner_all on public.project_agent_keys;
drop policy if exists app_control_settings_anon_all on public.app_control_settings;

create policy projects_app_all
on public.projects
for all
to anon, authenticated
using (true)
with check (true);

create policy project_data_fields_app_all
on public.project_data_fields
for all
to anon, authenticated
using (true)
with check (true);

create policy project_platform_accesses_app_all
on public.project_platform_accesses
for all
to anon, authenticated
using (true)
with check (true);

create policy project_env_variables_app_all
on public.project_env_variables
for all
to anon, authenticated
using (true)
with check (true);

create policy project_images_app_all
on public.project_images
for all
to anon, authenticated
using (true)
with check (true);

create policy project_agent_keys_app_all
on public.project_agent_keys
for all
to anon, authenticated
using (true)
with check (true);

create policy app_control_settings_anon_all
on public.app_control_settings
for all
to anon, authenticated
using (true)
with check (true);

grant select, insert, update, delete on
  public.projects,
  public.project_data_fields,
  public.project_platform_accesses,
  public.project_env_variables,
  public.project_images,
  public.project_agent_keys,
  public.app_control_settings
to anon, authenticated;

select table_name, column_name, is_nullable
from information_schema.columns
where table_schema = 'public'
  and (
    (table_name = 'projects' and column_name = 'user_id')
    or table_name = 'app_control_settings'
  )
order by table_name, ordinal_position;
```

## Script 1 - Setup comune

```sql
create extension if not exists pgcrypto;

create or replace function public.set_updated_at()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  new.updated_at = clock_timestamp();
  return new;
end;
$$;
```

## Script 2 - Progetti

```sql
create table public.projects (
  id uuid primary key default gen_random_uuid(),
  user_id uuid default auth.uid() references auth.users(id) on delete cascade,
  agent_project_id text not null,
  name text not null,
  status text not null default 'Attivo' check (status in ('Attivo', 'In pausa', 'Archivio', 'Idea')),
  development_environment text not null default 'Windsurf',
  github_repo_url text not null default '',
  github_account_email text not null default '',
  linked_secret_label_ciphertext text,
  deploy_provider text not null default 'Render',
  deploy_url text not null default '',
  deploy_account_email text not null default '',
  operational_notes text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, agent_project_id)
);

create index projects_user_updated_idx on public.projects (user_id, updated_at desc);
create index projects_user_status_idx on public.projects (user_id, status);
create index projects_user_name_idx on public.projects (user_id, name);
create index projects_user_agent_project_idx on public.projects (user_id, agent_project_id);

create trigger projects_set_updated_at
before update on public.projects
for each row execute function public.set_updated_at();
```

## Script 3 - Dati progetto e accessi piattaforme

```sql
create table public.project_data_fields (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  field_key text not null,
  label text not null,
  value_text text not null default '',
  value_ciphertext text,
  is_secret boolean not null default false,
  visible_by_default boolean not null default true,
  field_kind text not null default 'text' check (field_kind in ('text', 'email', 'password', 'url', 'select')),
  option_group text,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (project_id, field_key)
);

create table public.project_platform_accesses (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  platform text not null,
  email text not null default '',
  password_ciphertext text,
  password_visible_by_default boolean not null default true,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index project_data_fields_project_sort_idx on public.project_data_fields (project_id, sort_order, label);
create index project_platform_accesses_project_sort_idx on public.project_platform_accesses (project_id, sort_order, platform);

create trigger project_data_fields_set_updated_at
before update on public.project_data_fields
for each row execute function public.set_updated_at();

create trigger project_platform_accesses_set_updated_at
before update on public.project_platform_accesses
for each row execute function public.set_updated_at();
```

## Script 4 - Variabili ENV

```sql
create table public.project_env_variables (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  key text not null,
  value_text text not null default '',
  value_ciphertext text,
  scope text not null default 'Custom' check (scope in ('Supabase', 'GitHub', 'Deploy', 'Custom')),
  is_sensitive boolean not null default true,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (project_id, key)
);

create index project_env_variables_project_sort_idx on public.project_env_variables (project_id, sort_order, key);
create index project_env_variables_project_scope_idx on public.project_env_variables (project_id, scope);

create trigger project_env_variables_set_updated_at
before update on public.project_env_variables
for each row execute function public.set_updated_at();
```

## Script 5 - Immagini

```sql
create table public.project_images (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  slot_id text not null check (slot_id in ('logo-app', 'logo-app-2', 'logo-app-3', 'home-icon', 'browser-tab-icon')),
  name text not null,
  type text not null default 'Altro asset visivo' check (type in ('Logo', 'Icona', 'Grafica', 'Immagine pubblica', 'Altro asset visivo')),
  file_name text not null default '',
  mime_type text not null default '',
  size_bytes integer not null default 0 check (size_bytes >= 0),
  original_size_bytes integer not null default 0 check (original_size_bytes >= 0),
  path text not null default '',
  data_url text not null default '',
  notes text not null default '',
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (project_id, slot_id)
);

create index project_images_project_sort_idx on public.project_images (project_id, sort_order, slot_id);
create index project_images_project_type_idx on public.project_images (project_id, type);

create trigger project_images_set_updated_at
before update on public.project_images
for each row execute function public.set_updated_at();
```

Non creare seed nello script base. I nuovi progetti mostrano comunque gli slot fissi via UI; inserire o aggiornare record solo quando l'utente carica un file immagine.

## Script 5B - Aggiornamento immagini per database gia creato

Eseguire questo script solo se `project_images` e gia stata creata con lo schema precedente. Lo script e non distruttivo: aggiunge metadati per gli slot fissi e si ferma se trova righe immagine non riconducibili agli slot attuali.

```sql
alter table public.project_images
add column if not exists slot_id text,
add column if not exists file_name text not null default '',
add column if not exists mime_type text not null default '',
add column if not exists size_bytes integer not null default 0,
add column if not exists original_size_bytes integer not null default 0,
add column if not exists data_url text not null default '';

update public.project_images
set slot_id = case
  when lower(trim(name)) in ('logo principale', 'logo app') then 'logo-app'
  when lower(trim(name)) in ('logo app2', 'logo app 2') then 'logo-app-2'
  when lower(trim(name)) in ('logo app3', 'logo app 3') then 'logo-app-3'
  when lower(trim(name)) in ('icona app', 'icona schermata home') then 'home-icon'
  when lower(trim(name)) in ('icona tab browser', 'icona tab browser (favicon)', 'favicon') then 'browser-tab-icon'
  else slot_id
end
where slot_id is null;

do $$
begin
  if exists (
    select 1
    from public.project_images
    where slot_id is null
  ) then
    raise exception 'project_images contiene righe non mappabili agli slot fissi attuali. Correggere name/slot_id prima di continuare.';
  end if;
end;
$$;

update public.project_images
set
  name = case slot_id
    when 'logo-app' then 'Logo app'
    when 'logo-app-2' then 'Logo app 2'
    when 'logo-app-3' then 'Logo app 3'
    when 'home-icon' then 'Icona Schermata Home'
    when 'browser-tab-icon' then 'Icona Tab Browser (favicon)'
    else name
  end,
  type = case slot_id
    when 'logo-app' then 'Logo'
    when 'logo-app-2' then 'Logo'
    when 'logo-app-3' then 'Logo'
    when 'home-icon' then 'Icona'
    when 'browser-tab-icon' then 'Icona'
    else type
  end;

alter table public.project_images
alter column slot_id set not null;

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'project_images_slot_id_check'
      and conrelid = 'public.project_images'::regclass
  ) then
    alter table public.project_images
    add constraint project_images_slot_id_check
    check (slot_id in ('logo-app', 'logo-app-2', 'logo-app-3', 'home-icon', 'browser-tab-icon'));
  end if;

  if not exists (
    select 1 from pg_constraint
    where conname = 'project_images_size_bytes_check'
      and conrelid = 'public.project_images'::regclass
  ) then
    alter table public.project_images
    add constraint project_images_size_bytes_check
    check (size_bytes >= 0);
  end if;

  if not exists (
    select 1 from pg_constraint
    where conname = 'project_images_original_size_bytes_check'
      and conrelid = 'public.project_images'::regclass
  ) then
    alter table public.project_images
    add constraint project_images_original_size_bytes_check
    check (original_size_bytes >= 0);
  end if;
end;
$$;

create unique index if not exists project_images_project_slot_uidx
on public.project_images (project_id, slot_id);

create index if not exists project_images_project_sort_slot_idx
on public.project_images (project_id, sort_order, slot_id);

select
  column_name,
  data_type,
  is_nullable
from information_schema.columns
where table_schema = 'public'
  and table_name = 'project_images'
  and column_name in ('slot_id', 'name', 'file_name', 'mime_type', 'size_bytes', 'original_size_bytes', 'path', 'data_url')
order by ordinal_position;
```

## Script 6 - Agent key

```sql
create table public.project_agent_keys (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  name text not null default 'Default agent key',
  key_prefix text not null,
  key_hash text not null,
  key_ciphertext text,
  sync_prompt text not null default '',
  can_read_project boolean not null default true,
  can_read_env boolean not null default true,
  can_read_platform_accesses boolean not null default false,
  can_read_secrets boolean not null default false,
  can_prepare_git boolean not null default true,
  last_used_at timestamptz,
  revoked_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (project_id, key_prefix),
  unique (key_hash)
);

create index project_agent_keys_project_idx on public.project_agent_keys (project_id, revoked_at, created_at desc);

create trigger project_agent_keys_set_updated_at
before update on public.project_agent_keys
for each row execute function public.set_updated_at();
```

## Script 7A - Verifica stato prompt attuale

Eseguire per primo. Serve a capire se il database e gia vuoto lato prompt, se esiste una tabella compatibile o se e presente uno schema legacy da non aggiornare alla cieca.

```sql
select
  table_name
from information_schema.tables
where table_schema = 'public'
  and table_name in ('prompts', 'project_prompts', 'app_settings')
order by table_name;

select
  column_name,
  data_type,
  is_nullable
from information_schema.columns
where table_schema = 'public'
  and table_name = 'prompts'
order by ordinal_position;

select
  schemaname,
  tablename,
  policyname,
  roles,
  cmd
from pg_policies
where schemaname = 'public'
  and tablename = 'prompts'
order by policyname;

select
  tgrelid::regclass as table_name,
  tgname as trigger_name
from pg_trigger
where not tgisinternal
  and tgrelid = 'public.prompts'::regclass;
```

## Script 7B - Crea tabella `prompts` coerente con il codice reale

Eseguire solo dopo verifica positiva dello Script 7A o dopo avere confermato che eventuali tabelle legacy possono essere migrate/rimosse.

```sql
create table if not exists public.prompts (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  category text not null check (category in ('Prompt iniziali', 'Prompt manutenzione', 'Prompt vari')),
  full_text text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists prompts_category_updated_idx
  on public.prompts (category, updated_at desc);

create index if not exists prompts_title_idx
  on public.prompts (title);

drop trigger if exists prompts_set_updated_at on public.prompts;
create trigger prompts_set_updated_at
before update on public.prompts
for each row execute function public.set_updated_at();
```

## Script 8 - Impostazioni

Non eseguire. La pagina `Impostazioni` reale non usa `app_settings`: oggi gestisce solo il PIN tramite `app_control_settings`.

```sql
create table public.app_settings (
  user_id uuid primary key references auth.users(id) on delete cascade default auth.uid(),
  ui_mode text not null default 'light' check (ui_mode = 'light'),
  pin_enabled boolean not null default false,
  lock_timeout_minutes integer,
  security_notes text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (lock_timeout_minutes is null or lock_timeout_minutes > 0)
);

create trigger app_settings_set_updated_at
before update on public.app_settings
for each row execute function public.set_updated_at();
```

## Script 9 - RLS e policy Prompt per fase PIN attuale

Eseguire solo dopo avere creato una tabella `prompts` compatibile con il codice reale.

```sql
alter table public.prompts enable row level security;

drop policy if exists prompts_owner_all on public.prompts;
drop policy if exists prompts_app_all on public.prompts;

create policy prompts_app_all
on public.prompts
for all
to anon, authenticated
using (true)
with check (true);

grant select, insert, update, delete on public.prompts to anon, authenticated;
```

## Script 10 - Verifica finale Prompt + base schema

```sql
select table_name
from information_schema.tables
where table_schema = 'public'
  and table_name in (
    'projects',
    'project_data_fields',
    'project_platform_accesses',
    'project_env_variables',
    'project_images',
    'project_agent_keys',
    'prompts',
    'app_control_settings'
  )
order by table_name;

select tablename, rowsecurity
from pg_tables
where schemaname = 'public'
  and tablename in (
    'projects',
    'project_data_fields',
    'project_platform_accesses',
    'project_env_variables',
    'project_images',
    'project_agent_keys',
    'prompts',
    'app_control_settings'
  )
order by tablename;

select schemaname, tablename, policyname, roles, cmd
from pg_policies
where schemaname = 'public'
  and tablename in (
    'projects',
    'project_data_fields',
    'project_platform_accesses',
    'project_env_variables',
    'project_images',
    'project_agent_keys',
    'prompts',
    'app_control_settings'
  )
order by tablename, policyname;

select tgrelid::regclass as table_name, tgname as trigger_name
from pg_trigger
where not tgisinternal
  and tgname like '%set_updated_at'
order by table_name::text, trigger_name;
```

## Cosa non e ancora incluso

- Client Supabase frontend.
- `.env.example`.
- Auth UI.
- Cifratura applicativa.
- Migrazione dei dati locali di sessione in record reali.
- Storage bucket per immagini.
- Seed dei prompt o delle immagini.
- Persistenza reale della libreria Prompt finche non vengono eseguiti e verificati gli script `7A`, `7B`, `9`, `10`.

Questi punti richiedono una richiesta esplicita e modifiche codice dedicate.
