begin;

drop policy if exists "clients_delete_own_pins" on public.client_pinterest_selections;
create policy "clients_delete_own_pins" on public.client_pinterest_selections
for delete to authenticated
using (client_id = public.current_profile_client_id());

commit;
