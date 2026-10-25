-- Somente estrutura/configuração. Não consulta dados de clientes ou credenciais.
begin transaction read only;

select 'Tabela com RLS: ' || expected.name as verificacao,
  coalesce(c.relrowsecurity,false) as ok
from (values ('member_profiles'),('subscriptions'),('billing_payments'),
  ('billing_events'),('checkout_attempts'),('exclusive_contents')) as expected(name)
left join pg_catalog.pg_namespace n on n.nspname='public'
left join pg_catalog.pg_class c on c.relnamespace=n.oid and c.relname=expected.name and c.relkind='r'
union all
select 'Regras novas: colunas de créditos', count(*)=3
from information_schema.columns
where table_schema='public' and table_name='billing_payments'
  and column_name in ('paid_at','purchased_units','credited_units')
union all
select 'Função: resumo do acesso', to_regprocedure('public.member_access_summary()') is not null
union all
select 'Função: prévia de retenção', to_regprocedure('public.retention_candidates()') is not null
union all
select 'Trigger: criação do perfil', exists(
  select 1 from pg_catalog.pg_trigger
  where tgrelid=to_regclass('auth.users') and tgname='on_auth_user_created_hm'
    and not tgisinternal and tgenabled in ('O','A'))
union all
select 'Bucket member-videos existe e está privado', exists(
  select 1 from storage.buckets where id='member-videos' and public=false)
order by verificacao;

commit;
