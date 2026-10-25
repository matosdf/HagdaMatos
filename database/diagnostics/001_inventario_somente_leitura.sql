-- Execute no SQL Editor do projeto existente.
-- Somente catálogo de estrutura: não consulta registros, chaves ou senhas.
begin transaction read only;

select
  n.nspname as schema,
  c.relname as objeto,
  case c.relkind
    when 'r' then 'tabela'
    when 'p' then 'tabela particionada'
    when 'v' then 'view'
    when 'm' then 'view materializada'
  end as tipo,
  c.relrowsecurity as rls_ativo,
  coalesce((
    select string_agg(a.attname || ' (' || pg_catalog.format_type(a.atttypid,a.atttypmod) || ')', ', ' order by a.attnum)
    from pg_catalog.pg_attribute a
    where a.attrelid=c.oid and a.attnum>0 and not a.attisdropped
  ),'') as colunas,
  coalesce((
    select string_agg(p.policyname || ' [' || p.cmd || ']', ', ' order by p.policyname)
    from pg_catalog.pg_policies p
    where p.schemaname=n.nspname and p.tablename=c.relname
  ),'') as politicas
from pg_catalog.pg_class c
join pg_catalog.pg_namespace n on n.oid=c.relnamespace
where n.nspname='public' and c.relkind in ('r','p','v','m')
order by c.relname;

commit;
