-- Executar manualmente depois de cadastrar e confirmar o e-mail da proprietária.
-- Não executar automaticamente no cadastro, nem atribuir papel a partir de metadados.
do $$
declare v_user uuid;
begin
  select id into strict v_user from auth.users
  where lower(email)='matoshagda@gmail.com' and email_confirmed_at is not null;
  update public.member_profiles set is_owner=true,is_disabled=false where user_id=v_user;
  if not found then raise exception 'Perfil não encontrado. Aplique as migrações e confirme o cadastro.'; end if;
end $$;
