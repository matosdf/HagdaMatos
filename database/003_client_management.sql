begin;

alter table public.clients
  add column if not exists is_active boolean not null default true;

alter table public.profiles
  add column if not exists is_active boolean not null default true;

create unique index if not exists idx_profiles_unique_client
  on public.profiles(client_id)
  where client_id is not null;

create or replace function public.current_profile_role()
returns text
language sql
stable
security definer
set search_path = public
as $$
  select role
  from public.profiles
  where auth_user_id = auth.uid() and is_active = true
$$;

create or replace function public.current_profile_client_id()
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  select client_id
  from public.profiles
  where auth_user_id = auth.uid() and is_active = true
$$;

commit;
