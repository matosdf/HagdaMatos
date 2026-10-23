begin;

create type public.subscription_status as enum ('active','past_due','canceled','incomplete','unpaid');
create table public.member_profiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  full_name text not null default '', is_owner boolean not null default false,
  is_disabled boolean not null default false, created_at timestamptz not null default now()
);
create function public.create_member_profile() returns trigger language plpgsql security definer
set search_path = '' as $$ begin
  insert into public.member_profiles(user_id,full_name)
  values (new.id, coalesce(new.raw_user_meta_data->>'full_name','')) on conflict do nothing;
  return new;
end $$;
create trigger on_auth_user_created_hm after insert on auth.users
for each row execute function public.create_member_profile();
insert into public.member_profiles(user_id,full_name)
select id,coalesce(raw_user_meta_data->>'full_name','') from auth.users on conflict do nothing;

create table public.subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  provider text not null, provider_customer_id text not null, checkout_attempt_id uuid,
  provider_subscription_id text not null, status public.subscription_status not null default 'incomplete',
  plan_type text not null default 'monthly', amount_cents integer not null check(amount_cents > 0),
  payment_method text not null, current_period_start timestamptz, current_period_end timestamptz,
  cancel_at_period_end boolean not null default false, provider_canceled boolean not null default false,
  cancellation_requested_at timestamptz, payment_url text not null,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
  unique(provider,provider_subscription_id)
);
create index on public.subscriptions(user_id);
create unique index one_open_subscription_per_member on public.subscriptions(user_id) where not provider_canceled;
create table public.billing_payments (
  id uuid primary key default gen_random_uuid(), subscription_id uuid not null references public.subscriptions(id),
  provider text not null, provider_payment_id text not null,
  state text not null check(state in ('pending','paid','overdue','revoked')),
  amount_cents integer not null, period_start timestamptz not null, period_end timestamptz not null,
  observed_at timestamptz not null, unique(provider,provider_payment_id)
);
create table public.billing_events (
  provider text not null, event_id text not null, event_type text not null,
  processed_at timestamptz not null default now(), primary key(provider,event_id)
);
create table public.checkout_attempts (
  user_id uuid primary key references auth.users(id) on delete cascade,
  id uuid not null unique default gen_random_uuid(),
  state text not null default 'processing' check(state in ('processing','ready','needs_review')),
  accepted_terms_url text not null, accepted_terms_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);
create table public.exclusive_contents (
  id uuid primary key default gen_random_uuid(), title text not null,
  description text not null default '', storage_path text not null,
  published boolean not null default false, sort_order integer not null default 0,
  created_at timestamptz not null default now()
);

create function public.is_hm_owner() returns boolean language sql stable security definer set search_path = '' as $$
  select exists(select 1 from public.member_profiles where user_id=auth.uid() and is_owner and not is_disabled)
$$;
create function public.has_active_subscription(check_user_id uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select check_user_id = auth.uid() and exists(
    select 1 from public.subscriptions s join public.member_profiles p on p.user_id=s.user_id
    join public.billing_payments b on b.subscription_id=s.id
    where s.user_id=check_user_id and s.status='active' and not s.provider_canceled and not p.is_disabled
      and b.state='paid' and b.period_start<=now() and b.period_end>now()
  )
$$;
alter table public.member_profiles enable row level security;
alter table public.subscriptions enable row level security;
alter table public.billing_payments enable row level security;
alter table public.billing_events enable row level security;
alter table public.checkout_attempts enable row level security;
alter table public.exclusive_contents enable row level security;
create policy profiles_read on public.member_profiles for select to authenticated
using(user_id=auth.uid() or public.is_hm_owner());
create policy subscriptions_read on public.subscriptions for select to authenticated
using(user_id=auth.uid() or public.is_hm_owner());
create policy contents_read on public.exclusive_contents for select to authenticated
using(public.is_hm_owner() or (published and public.has_active_subscription(auth.uid())));
revoke all on public.member_profiles,public.subscriptions,public.billing_payments,public.billing_events,
  public.checkout_attempts,public.exclusive_contents from anon,authenticated;
grant select on public.member_profiles,public.subscriptions,public.exclusive_contents to authenticated;
grant all on public.member_profiles,public.subscriptions,public.billing_payments,public.billing_events,
  public.checkout_attempts,public.exclusive_contents to service_role;
revoke all on function public.create_member_profile() from public;
revoke all on function public.is_hm_owner(),public.has_active_subscription(uuid) from public;
grant execute on function public.is_hm_owner(),public.has_active_subscription(uuid) to authenticated;

-- A deduplicação, o pagamento e a vigência são gravados na mesma transação.
-- A aplicação consulta o estado atual do provedor antes de invocar esta função.
create function public.apply_billing_event(p jsonb) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare
  s public.subscriptions; prior public.billing_payments; paid public.billing_payments;
  v_state text; v_overdue boolean;
begin
  select * into s from public.subscriptions
  where provider=p->>'provider' and provider_subscription_id=p->>'subscriptionId' for update;
  if s.id is null then raise exception 'Subscription not registered yet'; end if;
  if s.provider_customer_id <> p->>'customerId' then raise exception 'Customer mismatch'; end if;
  insert into public.billing_events(provider,event_id,event_type)
  values(p->>'provider',p->>'eventId',p->>'eventType') on conflict do nothing;
  if not found then return jsonb_build_object('duplicate',true); end if;
  if p->>'kind'='subscription' then
    -- Cancelamento é terminal para este identificador; reativação requer nova contratação.
    if (p->>'canceled')::boolean then
      update public.subscriptions set provider_canceled=true,status='canceled',updated_at=now() where id=s.id;
      delete from public.checkout_attempts where user_id=s.user_id and id=s.checkout_attempt_id;
    end if;
    return jsonb_build_object('processed',true);
  end if;
  v_state := p->>'state';
  select * into prior from public.billing_payments
    where provider=p->>'provider' and provider_payment_id=p->>'paymentId';
  if prior.id is not null and prior.subscription_id<>s.id then raise exception 'Payment mismatch'; end if;
  if prior.id is not null and prior.observed_at>(p->>'observedAt')::timestamptz then
    return jsonb_build_object('stale',true);
  end if;
  if v_state='paid' and (p->>'amountCents')::integer<s.amount_cents then
    raise exception 'Payment amount below contracted price';
  end if;
  insert into public.billing_payments(subscription_id,provider,provider_payment_id,state,amount_cents,period_start,period_end,observed_at)
  values(s.id,p->>'provider',p->>'paymentId',v_state,(p->>'amountCents')::integer,
    (p->>'periodStart')::timestamptz,(p->>'periodEnd')::timestamptz,(p->>'observedAt')::timestamptz)
  on conflict(provider,provider_payment_id) do update set state=excluded.state,
    amount_cents=excluded.amount_cents,period_start=excluded.period_start,period_end=excluded.period_end,
    observed_at=excluded.observed_at;
  select * into paid from public.billing_payments where subscription_id=s.id and state='paid'
    order by period_end desc limit 1;
  select exists(select 1 from public.billing_payments where subscription_id=s.id and state='overdue') into v_overdue;
  update public.subscriptions set
    status=case when provider_canceled then 'canceled'::public.subscription_status
      when paid.period_end>now() then 'active'::public.subscription_status
      when v_overdue then 'past_due'::public.subscription_status
      when v_state='revoked' then 'unpaid'::public.subscription_status
      else 'incomplete'::public.subscription_status end,
    current_period_start=paid.period_start,current_period_end=paid.period_end,updated_at=now()
  where id=s.id;
  return jsonb_build_object('processed',true);
end $$;
revoke all on function public.apply_billing_event(jsonb) from public,anon,authenticated;
grant execute on function public.apply_billing_event(jsonb) to service_role;

insert into storage.buckets(id,name,public) values('member-videos','member-videos',false) on conflict(id) do nothing;
-- Sem política de leitura direta de storage.objects. A API revalida o acesso e emite URLs de 60 segundos.
commit;
