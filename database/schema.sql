create extension if not exists pgcrypto;

create table if not exists clients (
  id uuid primary key default gen_random_uuid(),
  full_name text not null,
  birth_date date,
  contact_phone text,
  email text not null unique,
  completed_services text[] not null default '{}',
  important_notes text,
  seasonal_pdf_url text,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists profiles (
  auth_user_id uuid primary key references auth.users(id) on delete cascade,
  role text not null check (role in ('client', 'owner')),
  client_id uuid references clients(id) on delete cascade,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (
    (role = 'owner' and client_id is null) or
    (role = 'client' and client_id is not null)
  )
);

create table if not exists client_photos (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references clients(id) on delete cascade,
  title text,
  image_url text not null,
  notes text,
  created_at timestamptz not null default now()
);

create table if not exists client_pinterest_selections (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references clients(id) on delete cascade,
  pin_url text not null,
  title text,
  notes text,
  created_at timestamptz not null default now()
);

create table if not exists birthday_notifications (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references clients(id) on delete cascade,
  notification_type text not null check (notification_type in ('daily', 'weekly')),
  notification_date date not null,
  sent_at timestamptz not null default now(),
  unique (client_id, notification_type, notification_date)
);

create index if not exists idx_profiles_client_id on profiles(client_id);
create unique index if not exists idx_profiles_unique_client on profiles(client_id) where client_id is not null;
create index if not exists idx_client_photos_client_id on client_photos(client_id);
create index if not exists idx_pinterest_client_id on client_pinterest_selections(client_id);
create index if not exists idx_clients_birth_date on clients(birth_date);
create index if not exists idx_birthday_notifications_client_id on birthday_notifications(client_id);

create or replace function public.current_profile_role()
returns text
language sql
stable
security definer
set search_path = public
as $$
  select role from public.profiles where auth_user_id = auth.uid() and is_active = true
$$;

create or replace function public.current_profile_client_id()
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  select client_id from public.profiles where auth_user_id = auth.uid() and is_active = true
$$;

revoke all on function public.current_profile_role() from public;
revoke all on function public.current_profile_client_id() from public;
grant execute on function public.current_profile_role() to authenticated;
grant execute on function public.current_profile_client_id() to authenticated;

alter table profiles enable row level security;
alter table clients enable row level security;
alter table client_photos enable row level security;
alter table client_pinterest_selections enable row level security;
alter table birthday_notifications enable row level security;

revoke all on profiles, clients, client_photos, client_pinterest_selections, birthday_notifications from anon;
grant select, insert, update, delete on profiles, clients, client_photos, client_pinterest_selections, birthday_notifications to authenticated;

create policy "profiles_select_own_or_owner" on profiles
for select to authenticated
using (auth_user_id = auth.uid() or public.current_profile_role() = 'owner');

create policy "clients_select_own_or_owner" on clients
for select to authenticated
using (id = public.current_profile_client_id() or public.current_profile_role() = 'owner');

create policy "photos_select_own_or_owner" on client_photos
for select to authenticated
using (client_id = public.current_profile_client_id() or public.current_profile_role() = 'owner');

create policy "pins_select_own_or_owner" on client_pinterest_selections
for select to authenticated
using (client_id = public.current_profile_client_id() or public.current_profile_role() = 'owner');

create policy "clients_insert_own_pins" on client_pinterest_selections
for insert to authenticated
with check (client_id = public.current_profile_client_id());

create policy "clients_delete_own_pins" on client_pinterest_selections
for delete to authenticated
using (client_id = public.current_profile_client_id());

create policy "owner_manage_profiles" on profiles
for all to authenticated
using (public.current_profile_role() = 'owner')
with check (public.current_profile_role() = 'owner');

create policy "owner_manage_clients" on clients
for all to authenticated
using (public.current_profile_role() = 'owner')
with check (public.current_profile_role() = 'owner');

create policy "owner_manage_photos" on client_photos
for all to authenticated
using (public.current_profile_role() = 'owner')
with check (public.current_profile_role() = 'owner');

create policy "owner_manage_pins" on client_pinterest_selections
for all to authenticated
using (public.current_profile_role() = 'owner')
with check (public.current_profile_role() = 'owner');

create policy "owner_manage_birthday_notifications" on birthday_notifications
for all to authenticated
using (public.current_profile_role() = 'owner')
with check (public.current_profile_role() = 'owner');
