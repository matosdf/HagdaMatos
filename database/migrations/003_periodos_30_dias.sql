begin;

-- Não inventar datas de pagamento ao migrar dados de produção.
do $$ begin
  if exists(select 1 from public.billing_payments where state='paid') then
    raise exception 'Há pagamentos anteriores. Reconcilie datas efetivas e períodos antes de aplicar a migração 003.';
  end if;
end $$;

alter table public.subscriptions add column product_code text not null default 'hm-presenca-180-v1';
alter table public.subscriptions add column canceled_at timestamptz;
alter table public.subscriptions add column billing_review_required boolean not null default false;
alter table public.billing_payments add column paid_at timestamptz;
alter table public.billing_payments add column purchased_units integer not null default 0;
alter table public.billing_payments add column credited_units integer not null default 0 check(credited_units between 0 and 6);
alter table public.checkout_attempts add column requested_units integer not null default 1 check(requested_units between 1 and 6);
alter table public.checkout_attempts add column terms_version text;
alter table public.member_profiles add column legal_hold boolean not null default false;

-- Uma trava por cliente serializa pagamentos de assinaturas distintas/readmissões.
create function public.rebuild_member_access(p_user uuid) returns void
language plpgsql security definer set search_path='' as $$
declare r record; v_cursor timestamptz; v_start timestamptz; v_end timestamptz;
  v_used integer := 0; v_units integer; v_product text;
begin
  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(p_user::text,0));
  for v_product in select distinct product_code from public.subscriptions where user_id=p_user loop
    v_cursor:=null; v_used:=0;
    update public.billing_payments b set credited_units=0,period_start='epoch',period_end='epoch'
      from public.subscriptions s where b.subscription_id=s.id and s.user_id=p_user and s.product_code=v_product;
    for r in select b.* from public.billing_payments b join public.subscriptions s on s.id=b.subscription_id
      where s.user_id=p_user and s.product_code=v_product and b.state='paid' and b.paid_at is not null
      order by b.paid_at,b.provider_payment_id loop
      v_units:=least(r.purchased_units,greatest(0,6-v_used));
      if v_units>0 then
        v_start:=greatest(r.paid_at,v_cursor);
        v_end:=v_start+pg_catalog.make_interval(secs=>v_units*2592000);
        update public.billing_payments set credited_units=v_units,period_start=v_start,period_end=v_end where id=r.id;
        v_cursor:=v_end; v_used:=v_used+v_units;
      end if;
    end loop;
  end loop;
  update public.subscriptions s set
    current_period_start=(select min(period_start) from public.billing_payments where subscription_id=s.id and credited_units>0 and state='paid'),
    current_period_end=(select max(period_end) from public.billing_payments where subscription_id=s.id and credited_units>0 and state='paid'),
    status=case when s.provider_canceled then 'canceled'::public.subscription_status
      when exists(select 1 from public.billing_payments where subscription_id=s.id and credited_units>0 and period_end>now()) then 'active'::public.subscription_status
      when exists(select 1 from public.billing_payments where subscription_id=s.id and state='overdue') then 'past_due'::public.subscription_status
      when exists(select 1 from public.billing_payments where subscription_id=s.id and state='revoked') then 'unpaid'::public.subscription_status
      else 'incomplete'::public.subscription_status end,
    billing_review_required=exists(select 1 from public.billing_payments where subscription_id=s.id and state='paid' and (purchased_units=0 or credited_units<purchased_units)),
    updated_at=now()
  where s.user_id=p_user;
end $$;

create or replace function public.apply_billing_event(p jsonb) returns jsonb
language plpgsql security definer set search_path='' as $$
declare s public.subscriptions; prior public.billing_payments; v_state text; v_paid_at timestamptz;
  v_amount integer; v_units integer;
begin
  select * into s from public.subscriptions where provider=p->>'provider' and provider_subscription_id=p->>'subscriptionId';
  if s.id is null then raise exception 'Subscription not registered yet'; end if;
  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(s.user_id::text,0));
  select * into s from public.subscriptions where id=s.id for update;
  if s.provider_customer_id<>p->>'customerId' then raise exception 'Customer mismatch'; end if;
  insert into public.billing_events(provider,event_id,event_type) values(p->>'provider',p->>'eventId',p->>'eventType') on conflict do nothing;
  if not found then return jsonb_build_object('duplicate',true); end if;
  if p->>'kind'='subscription' then
    if (p->>'canceled')::boolean then
      update public.subscriptions set provider_canceled=true,cancel_at_period_end=true,
        canceled_at=coalesce(canceled_at,now()) where id=s.id;
      delete from public.checkout_attempts where user_id=s.user_id and id=s.checkout_attempt_id;
    end if;
    perform public.rebuild_member_access(s.user_id);
    return jsonb_build_object('processed',true);
  end if;
  v_state:=p->>'state'; v_amount:=(p->>'amountCents')::integer;
  select * into prior from public.billing_payments where provider=p->>'provider' and provider_payment_id=p->>'paymentId';
  if prior.id is not null and prior.subscription_id<>s.id then raise exception 'Payment mismatch'; end if;
  if prior.id is not null and prior.observed_at>(p->>'observedAt')::timestamptz then return jsonb_build_object('stale',true); end if;
  v_paid_at:=coalesce(prior.paid_at,(p->>'paidAt')::timestamptz);
  if v_state='paid' then
    if v_paid_at is null then raise exception 'Actual payment timestamp required'; end if;
    if v_paid_at>now()+interval '5 minutes' then raise exception 'Future payment timestamp'; end if;
    -- Compra de N períodos; não arredondar frações de R$129 para conceder acesso.
    if v_amount>=s.amount_cents and v_amount%s.amount_cents=0 then v_units:=v_amount/s.amount_cents;
    else v_units:=0; end if;
    if v_units>6 then v_units:=0; end if;
  else v_units:=coalesce(prior.purchased_units,0); end if;
  insert into public.billing_payments(subscription_id,provider,provider_payment_id,state,amount_cents,period_start,period_end,observed_at,paid_at,purchased_units)
  values(s.id,p->>'provider',p->>'paymentId',v_state,v_amount,'epoch','epoch',(p->>'observedAt')::timestamptz,v_paid_at,v_units)
  on conflict(provider,provider_payment_id) do update set state=excluded.state,amount_cents=excluded.amount_cents,
    observed_at=excluded.observed_at,paid_at=excluded.paid_at,purchased_units=excluded.purchased_units;
  perform public.rebuild_member_access(s.user_id);
  return jsonb_build_object('processed',true);
end $$;

create or replace function public.has_active_subscription(check_user_id uuid) returns boolean
language sql stable security definer set search_path='' as $$
  select check_user_id=auth.uid() and exists(
    select 1 from public.billing_payments b join public.subscriptions s on s.id=b.subscription_id
    join public.member_profiles m on m.user_id=s.user_id
    where s.user_id=check_user_id and not m.is_disabled and b.state='paid' and b.credited_units>0
      and b.period_start<=now() and b.period_end>now()
  )
$$;

create function public.member_access_summary() returns jsonb
language sql stable security definer set search_path='' as $$
  select jsonb_build_object(
    'usedPeriods',coalesce(sum(b.credited_units),0),
    'remainingPeriods',greatest(0,6-coalesce(sum(b.credited_units),0)),
    'paidUntil',max(case when b.credited_units>0 then b.period_end end),
    'hasAccess',public.has_active_subscription(auth.uid()))
  from public.billing_payments b join public.subscriptions s on s.id=b.subscription_id
  where s.user_id=auth.uid() and s.product_code='hm-presenca-180-v1' and b.state='paid'
$$;

-- Somente prévia: nenhuma função desta migração apaga dados ou contas.
create function public.retention_candidates() returns table(user_id uuid,access_ended_at timestamptz,deletion_due_at timestamptz)
language sql stable security definer set search_path='' as $$
  with lifecycle as (
    select s.user_id,greatest(max(s.canceled_at),max(case when b.credited_units>0 and b.state='paid' then b.period_end end)) as ended_at
    from public.subscriptions s left join public.billing_payments b on b.subscription_id=s.id
    group by s.user_id
    having bool_and(s.provider_canceled) and max(s.canceled_at) is not null
  )
  select l.user_id,l.ended_at,l.ended_at+interval '2160 hours' from lifecycle l
  join public.member_profiles m on m.user_id=l.user_id
  where not m.is_owner and not m.legal_hold and l.ended_at+interval '2160 hours'<=now()
$$;
revoke all on function public.rebuild_member_access(uuid),public.retention_candidates(),public.member_access_summary() from public,anon,authenticated;
grant execute on function public.rebuild_member_access(uuid),public.retention_candidates() to service_role;
grant execute on function public.member_access_summary() to authenticated;
commit;
