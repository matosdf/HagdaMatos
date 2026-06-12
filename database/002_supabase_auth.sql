begin;

create table if not exists public.profiles (
  auth_user_id uuid primary key references auth.users(id) on delete cascade,
  role text not null check (role in ('client', 'owner')),
  client_id uuid references public.clients(id) on delete cascade,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (
    (role = 'owner' and client_id is null) or
    (role = 'client' and client_id is not null)
  )
);

create index if not exists idx_profiles_client_id on public.profiles(client_id);

create or replace function public.current_profile_role()
returns text
language sql
stable
security definer
set search_path = public
as $$
  select role from public.profiles where auth_user_id = auth.uid()
$$;

create or replace function public.current_profile_client_id()
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  select client_id from public.profiles where auth_user_id = auth.uid()
$$;

revoke all on function public.current_profile_role() from public;
revoke all on function public.current_profile_client_id() from public;
grant execute on function public.current_profile_role() to authenticated;
grant execute on function public.current_profile_client_id() to authenticated;

alter table public.profiles enable row level security;
alter table public.clients enable row level security;
alter table public.client_photos enable row level security;
alter table public.client_pinterest_selections enable row level security;
alter table public.birthday_notifications enable row level security;

revoke all on public.profiles, public.clients, public.client_photos, public.client_pinterest_selections, public.birthday_notifications from anon;
grant select, insert, update, delete on public.profiles, public.clients, public.client_photos, public.client_pinterest_selections, public.birthday_notifications to authenticated;

drop policy if exists "profiles_select_own_or_owner" on public.profiles;
create policy "profiles_select_own_or_owner" on public.profiles
for select to authenticated
using (auth_user_id = auth.uid() or public.current_profile_role() = 'owner');

drop policy if exists "clients_select_own_or_owner" on public.clients;
create policy "clients_select_own_or_owner" on public.clients
for select to authenticated
using (id = public.current_profile_client_id() or public.current_profile_role() = 'owner');

drop policy if exists "photos_select_own_or_owner" on public.client_photos;
create policy "photos_select_own_or_owner" on public.client_photos
for select to authenticated
using (client_id = public.current_profile_client_id() or public.current_profile_role() = 'owner');

drop policy if exists "pins_select_own_or_owner" on public.client_pinterest_selections;
create policy "pins_select_own_or_owner" on public.client_pinterest_selections
for select to authenticated
using (client_id = public.current_profile_client_id() or public.current_profile_role() = 'owner');

drop policy if exists "clients_insert_own_pins" on public.client_pinterest_selections;
create policy "clients_insert_own_pins" on public.client_pinterest_selections
for insert to authenticated
with check (client_id = public.current_profile_client_id());

drop policy if exists "owner_manage_profiles" on public.profiles;
create policy "owner_manage_profiles" on public.profiles
for all to authenticated
using (public.current_profile_role() = 'owner')
with check (public.current_profile_role() = 'owner');

drop policy if exists "owner_manage_clients" on public.clients;
create policy "owner_manage_clients" on public.clients
for all to authenticated
using (public.current_profile_role() = 'owner')
with check (public.current_profile_role() = 'owner');

drop policy if exists "owner_manage_photos" on public.client_photos;
create policy "owner_manage_photos" on public.client_photos
for all to authenticated
using (public.current_profile_role() = 'owner')
with check (public.current_profile_role() = 'owner');

drop policy if exists "owner_manage_pins" on public.client_pinterest_selections;
create policy "owner_manage_pins" on public.client_pinterest_selections
for all to authenticated
using (public.current_profile_role() = 'owner')
with check (public.current_profile_role() = 'owner');

drop policy if exists "owner_manage_birthday_notifications" on public.birthday_notifications;
create policy "owner_manage_birthday_notifications" on public.birthday_notifications
for all to authenticated
using (public.current_profile_role() = 'owner')
with check (public.current_profile_role() = 'owner');

commit;
