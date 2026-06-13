begin;

do $$
begin
  if to_regclass('public.client_social_references') is null
     and to_regclass('public.client_pinterest_selections') is not null then
    alter table public.client_pinterest_selections rename to client_social_references;
  end if;
end
$$;

do $$
begin
  if exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'client_social_references'
      and column_name = 'pin_url'
  ) then
    alter table public.client_social_references rename column pin_url to social_url;
  end if;
end
$$;

alter table public.client_social_references
  add column if not exists network text;

update public.client_social_references
set network = case
  when lower(social_url) ~ '^https://([a-z0-9-]+\.)?instagram\.com/' then 'instagram'
  when lower(social_url) ~ '^https://([a-z0-9-]+\.)?linkedin\.com/' then 'linkedin'
  else 'legacy'
end
where network is null;

alter table public.client_social_references
  alter column network set not null;

alter table public.client_social_references
  drop constraint if exists client_social_references_network_check;

alter table public.client_social_references
  add constraint client_social_references_network_check
  check (network in ('instagram', 'linkedin', 'legacy'));

alter table public.client_social_references
  drop constraint if exists client_social_references_url_network_check;

alter table public.client_social_references
  add constraint client_social_references_url_network_check
  check (
    network = 'legacy'
    or (network = 'instagram' and lower(social_url) ~ '^https://([a-z0-9-]+\.)?instagram\.com(/|$)')
    or (network = 'linkedin' and lower(social_url) ~ '^https://([a-z0-9-]+\.)?linkedin\.com(/|$)')
  );

alter table public.client_social_references
  drop column if exists title;

drop index if exists public.idx_pinterest_client_id;
create index if not exists idx_social_references_client_id
  on public.client_social_references(client_id);

alter table public.client_social_references enable row level security;

revoke all on public.client_social_references from anon;
grant select, insert, update, delete on public.client_social_references to authenticated;

drop policy if exists "pins_select_own_or_owner" on public.client_social_references;
drop policy if exists "clients_insert_own_pins" on public.client_social_references;
drop policy if exists "clients_delete_own_pins" on public.client_social_references;
drop policy if exists "owner_manage_pins" on public.client_social_references;

drop policy if exists "social_references_select_own_or_owner" on public.client_social_references;
create policy "social_references_select_own_or_owner" on public.client_social_references
for select to authenticated
using (client_id = public.current_profile_client_id() or public.current_profile_role() = 'owner');

drop policy if exists "clients_insert_own_social_references" on public.client_social_references;
create policy "clients_insert_own_social_references" on public.client_social_references
for insert to authenticated
with check (
  client_id = public.current_profile_client_id()
  and network in ('instagram', 'linkedin')
);

drop policy if exists "clients_delete_own_social_references" on public.client_social_references;
create policy "clients_delete_own_social_references" on public.client_social_references
for delete to authenticated
using (client_id = public.current_profile_client_id());

drop policy if exists "owner_manage_social_references" on public.client_social_references;
create policy "owner_manage_social_references" on public.client_social_references
for all to authenticated
using (public.current_profile_role() = 'owner')
with check (public.current_profile_role() = 'owner');

commit;
