import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { PGlite } from '@electric-sql/pglite';
const user='11111111-1111-4111-8111-111111111111';
const other='22222222-2222-4222-8222-222222222222';
test('PostgreSQL: webhooks atômicos, isolamento RLS, expiração e cancelamento',async()=>{
  const db=new PGlite();
  try{
    await db.exec(`create role anon; create role authenticated; create role service_role bypassrls;
      create schema auth; create schema storage;
      create table auth.users(id uuid primary key,raw_user_meta_data jsonb default '{}');
      create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid $$;
      grant usage on schema auth,public to authenticated,anon,service_role;
      grant execute on function auth.uid() to authenticated,anon,service_role;
      create table storage.buckets(id text primary key,name text,public boolean);
    `);
    await db.exec(await readFile(new URL('../database/migrations/002_membros_assinaturas.sql',import.meta.url),'utf8'));
    await db.query(`insert into auth.users(id) values($1),($2)`,[user,other]);
    const {rows:[subscription]}=await db.query<{id:string}>(`insert into public.subscriptions(user_id,provider,provider_customer_id,provider_subscription_id,amount_cents,payment_method,payment_url)
      values($1,'asaas','cus_test','sub_test',9700,'CREDIT_CARD','https://www.asaas.com/i/test') returning id`,[user]);
    await db.exec(`insert into public.exclusive_contents(title,storage_path,published) values('Aula 1','aula-1.mp4',true);`);
    const start=new Date(Date.now()-86400000).toISOString(),end=new Date(Date.now()+86400000*29).toISOString();
    let counter=0;
    const event=(values:Record<string,unknown>={})=>({provider:'asaas',eventId:`evt_${++counter}`,eventType:'PAYMENT_CONFIRMED',kind:'payment',
      subscriptionId:'sub_test',customerId:'cus_test',paymentId:'pay_test',state:'paid',amountCents:9700,
      periodStart:start,periodEnd:end,observedAt:new Date().toISOString(),...values});
    const apply=async(payload:unknown)=>db.query(`select public.apply_billing_event($1::jsonb)`,[JSON.stringify(payload)]);
    const count=async(table:string)=>Number((await db.query<{n:number}>(`select count(*)::int as n from public.${table}`)).rows[0].n);
    const asUser=async(id:string)=>{await db.exec(`reset role;set role authenticated;`);await db.query(`select set_config('request.jwt.claim.sub',$1,false)`,[id]);};
    await asUser(user);assert.equal(await count('exclusive_contents'),0);
    await db.exec('reset role');const first=event();await apply(first);await apply(first);
    assert.equal(await count('billing_events'),1);assert.equal(await count('billing_payments'),1);
    await apply(event({eventType:'PAYMENT_RECEIVED'}));
    const {rows:[state]}=await db.query<{current_period_end:Date}>(`select current_period_end from public.subscriptions where id=$1`,[subscription.id]);
    assert.equal(new Date(state.current_period_end).toISOString(),end,'evento posterior não acrescenta um mês');
    await asUser(user);assert.equal(await count('exclusive_contents'),1);assert.equal(await count('subscriptions'),1);
    await assert.rejects(()=>db.exec(`update public.member_profiles set is_owner=true`));
    await assert.rejects(()=>db.exec(`update public.subscriptions set status='active'`));
    await assert.rejects(()=>apply(event()),/permission denied/);
    await asUser(other);assert.equal(await count('exclusive_contents'),0);assert.equal(await count('subscriptions'),0);
    await db.exec('reset role');await apply(event({state:'revoked',eventType:'PAYMENT_REFUNDED'}));
    await asUser(user);assert.equal(await count('exclusive_contents'),0);
    await db.exec('reset role');await apply(event({paymentId:'pay_renewal'}));
    await asUser(user);assert.equal(await count('exclusive_contents'),1);
    await db.exec('reset role');
    await apply(event({paymentId:'pay_future',periodStart:new Date(Date.now()+86400000*40).toISOString(),periodEnd:new Date(Date.now()+86400000*70).toISOString()}));
    await asUser(user);assert.equal(await count('exclusive_contents'),1,'pagamento futuro não interrompe o período atual');
    await db.exec('reset role');
    await db.query(`insert into public.subscriptions(user_id,provider,provider_customer_id,provider_subscription_id,amount_cents,payment_method,payment_url)
      values($1,'asaas','cus_other','sub_other',9700,'PIX','https://www.asaas.com/i/other')`,[other]);
    await apply(event({subscriptionId:'sub_other',customerId:'cus_other',paymentId:'pay_other_future',
      periodStart:new Date(Date.now()+86400000*2).toISOString(),periodEnd:new Date(Date.now()+86400000*32).toISOString()}));
    await asUser(other);assert.equal(await count('exclusive_contents'),0,'período futuro não abre acesso antes da hora');
    await db.exec('reset role');await db.query(`update public.member_profiles set is_disabled=true where user_id=$1`,[user]);
    await asUser(user);assert.equal(await count('exclusive_contents'),0);
    await db.exec('reset role');await db.query(`update public.member_profiles set is_disabled=false where user_id=$1`,[user]);
    await apply(event({paymentId:'pay_renewal',state:'revoked',observedAt:new Date(Date.now()+60000).toISOString()}));
    await apply(event({paymentId:'pay_renewal',state:'paid',observedAt:new Date(Date.now()-60000).toISOString()}));
    await asUser(user);assert.equal(await count('exclusive_contents'),0,'snapshot antigo não reverte o estorno mais novo');
    await db.exec('reset role');
    const bad=event({paymentId:'pay_bad',amountCents:1});
    await assert.rejects(()=>apply(bad),/below contracted price/);
    const {rows:[badCount]}=await db.query<{n:number}>(`select count(*)::int as n from public.billing_events where event_id=$1`,[bad.eventId]);
    assert.equal(badCount.n,0,'falha reverte marcação do evento e permite reenvio');
    await apply(event({kind:'subscription',canceled:true,eventType:'SUBSCRIPTION_DELETED'}));
    await apply(event({paymentId:'pay_after_cancel'}));
    await asUser(user);assert.equal(await count('exclusive_contents'),0,'pagamento não reativa assinatura cancelada');
    await db.exec('reset role');
    await db.query(`update public.subscriptions set status='active',current_period_end=now()-interval '1 second' where id=$1`,[subscription.id]);
    await asUser(user);assert.equal(await count('exclusive_contents'),0,'RLS bloqueia assim que a vigência termina');
  }finally{await db.close();}
});
