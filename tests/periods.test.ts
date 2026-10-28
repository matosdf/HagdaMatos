import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {PGlite} from '@electric-sql/pglite';
import {PRODUCT,totalPrice} from '../src/lib/product';
import {AsaasGateway} from '../src/lib/payments/asaas.provider';
const day=86400000;
test('preço aprovado e máximo de seis períodos',()=>{
  assert.equal(PRODUCT.priceCents,12900);assert.equal(totalPrice(6),77400);
  assert.throws(()=>totalPrice(7));assert.throws(()=>totalPrice(0));assert.throws(()=>totalPrice(1.5));
});
test('PostgreSQL v3: créditos de 30 dias, antecipação, cancelamento, estorno e retenção',async t=>{
  const db=new PGlite();const uid='33333333-3333-4333-8333-333333333333';
  const now=Date.now(),date=(offset:number)=>new Date(now+offset*day).toISOString();
  let sequence=0;
  try{
    await db.exec(`create role anon;create role authenticated;create role service_role bypassrls;
      create schema auth;create schema storage;
      create table auth.users(id uuid primary key,raw_user_meta_data jsonb default '{}');
      create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid $$;
      grant usage on schema auth,public to authenticated,anon,service_role;
      grant execute on function auth.uid() to authenticated,anon,service_role;
      create table storage.buckets(id text primary key,name text,public boolean);`);
    for(const file of ['002_membros_assinaturas.sql','003_periodos_30_dias.sql'])
      await db.exec(await readFile(new URL('../database/migrations/'+file,import.meta.url),'utf8'));
    await db.query(`insert into auth.users(id) values($1)`,[uid]);
    const {rows:[sub]}=await db.query<{id:string}>(`insert into public.subscriptions(user_id,provider,provider_customer_id,provider_subscription_id,amount_cents,payment_method,payment_url)
      values($1,'test','cus_v3','sub_v3',12900,'PIX','https://www.asaas.com/i/test') returning id`,[uid]);
    const event=(extra:Record<string,unknown>={})=>({provider:'test',eventId:'evt_'+ ++sequence,eventType:'TEST_VERIFIED_PAYMENT',kind:'payment',
      subscriptionId:'sub_v3',customerId:'cus_v3',paymentId:'p1',state:'paid',amountCents:12900,paidAt:date(-5),observedAt:new Date().toISOString(),...extra});
    const apply=(input:unknown)=>db.query('select public.apply_billing_event($1::jsonb)',[JSON.stringify(input)]);
    const summary=async()=>{await db.exec('set role authenticated');await db.query(`select set_config('request.jwt.claim.sub',$1,false)`,[uid]);
      try{return (await db.query<{value:{usedPeriods:number;remainingPeriods:number;paidUntil:string;hasAccess:boolean}}>('select public.member_access_summary() as value')).rows[0].value;}
      finally{await db.exec('reset role');}};
    await t.test('um pagamento começa na data efetiva e dura exatamente 720 horas',async()=>{
      const p=event();await apply(p);await apply(p);
      const s=await summary();assert.equal(s.usedPeriods,1);assert.equal(Date.parse(s.paidUntil),Date.parse(date(25)));assert.equal(s.hasAccess,true);
    });
    await t.test('snapshot Asaas alimenta v3 sem mês de calendário nem crédito duplicado',async()=>{
      const original=global.fetch;
      const saved={key:process.env.ASAAS_API_KEY,url:process.env.ASAAS_API_URL};
      process.env.ASAAS_API_KEY='test-only';process.env.ASAAS_API_URL='https://api-sandbox.asaas.com/v3';
      const payment={id:'p_adapter',subscription:'sub_v3',customer:'cus_v3',status:'CONFIRMED',value:129,
        billingType:'CREDIT_CARD',dueDate:date(-20).slice(0,10),confirmedDate:date(-4).slice(0,10),paymentDate:null};
      const before=Date.parse((await summary()).paidUntil);
      try{
        global.fetch=async()=>Response.json(payment);
        const first=await new AsaasGateway().getPayment('p_adapter');
        await apply(event({...first}));
        assert.equal(Date.parse((await summary()).paidUntil),before+30*day);
        global.fetch=async()=>Response.json({...payment,status:'RECEIVED',paymentDate:date(-1).slice(0,10)});
        await apply(event({...await new AsaasGateway().getPayment('p_adapter')}));
        assert.equal((await summary()).usedPeriods,2);
        assert.equal(Date.parse((await summary()).paidUntil),before+30*day);
        global.fetch=async()=>Response.json({...payment,status:'REFUNDED',confirmedDate:null});
        await apply(event({...await new AsaasGateway().getPayment('p_adapter')}));
        assert.equal((await summary()).usedPeriods,1);
        assert.equal(Date.parse((await summary()).paidUntil),before);
      }finally{
        global.fetch=original;
        for(const [key,value] of Object.entries({ASAAS_API_KEY:saved.key,ASAAS_API_URL:saved.url})){
          if(value===undefined)delete process.env[key];else process.env[key]=value;
        }
      }
    });
    await t.test('pagamento antecipado soma mais 30 dias ao saldo, sem sobreposição',async()=>{
      await apply(event({paymentId:'p2',paidAt:date(-1)}));
      assert.equal(Date.parse((await summary()).paidUntil),Date.parse(date(55)));
    });
    await t.test('pagamento de três períodos acrescenta 90 dias',async()=>{
      await apply(event({paymentId:'p3',paidAt:date(-0.5),amountCents:38700}));
      const s=await summary();assert.equal(s.usedPeriods,5);assert.equal(Date.parse(s.paidUntil),Date.parse(date(145)));
    });
    await t.test('cancelar preserva créditos e não encerra a biblioteca',async()=>{
      await apply(event({kind:'subscription',canceled:true}));
      assert.equal((await summary()).hasAccess,true);
      assert.equal((await db.query<{status:string}>('select status from public.subscriptions where id=$1',[sub.id])).rows[0].status,'canceled');
      assert.equal((await db.query('select * from public.retention_candidates()')).rows.length,0,'não excluir durante acesso pago');
    });
    await t.test('limite de seis também vale em readmissão e excesso exige revisão financeira',async()=>{
      await db.query(`insert into public.subscriptions(user_id,provider,provider_customer_id,provider_subscription_id,amount_cents,payment_method,payment_url)
        values($1,'test','cus_v3','sub_readmit',12900,'PIX','https://www.asaas.com/i/test')`,[uid]);
      await apply(event({subscriptionId:'sub_readmit',paymentId:'p4',paidAt:date(-0.1),amountCents:25800}));
      const s=await summary();assert.equal(s.usedPeriods,6);assert.equal(s.remainingPeriods,0);
      assert.equal(Date.parse(s.paidUntil),Date.parse(date(175)));
      assert.equal((await db.query<{billing_review_required:boolean}>(`select billing_review_required from public.subscriptions where provider_subscription_id='sub_readmit'`)).rows[0].billing_review_required,true);
    });
    await t.test('estorno remove seus créditos, mantendo os demais pagamentos válidos',async()=>{
      await apply(event({paymentId:'p3',state:'revoked',paidAt:date(-0.5),amountCents:38700}));
      const s=await summary();assert.equal(s.usedPeriods,4);assert.equal(s.hasAccess,true);
    });
    await t.test('sem data efetiva não libera acesso e a transação pode ser reenviada',async()=>{
      const invalid=event({paymentId:'no_date',paidAt:null});
      await assert.rejects(()=>apply(invalid),/Actual payment timestamp/);
      assert.equal((await db.query('select 1 from public.billing_events where event_id=$1',[invalid.eventId])).rows.length,0);
    });
    await t.test('RLS considera bloqueio administrativo e não expõe financeiro bruto',async()=>{
      await db.query('update public.member_profiles set is_disabled=true where user_id=$1',[uid]);assert.equal((await summary()).hasAccess,false);
      await db.query('update public.member_profiles set is_disabled=false where user_id=$1',[uid]);
      await db.exec('set role authenticated');await assert.rejects(()=>db.query('select * from public.billing_payments'),/permission denied/);await db.exec('reset role');
    });
    await t.test('retenção: 90 dias após o acesso, com exclusão apenas em prévia',async()=>{
      await apply(event({subscriptionId:'sub_readmit',kind:'subscription',canceled:true}));
      await db.query(`update public.subscriptions set canceled_at=now()-interval '250 days' where user_id=$1`,[uid]);
      await db.query(`update public.billing_payments set period_start=now()-interval '140 days',period_end=now()-interval '100 days' where credited_units>0`);
      assert.equal((await db.query('select * from public.retention_candidates()')).rows.length,1);
      await db.query('update public.member_profiles set legal_hold=true where user_id=$1',[uid]);
      assert.equal((await db.query('select * from public.retention_candidates()')).rows.length,0);
      assert.equal((await db.query('select * from auth.users')).rows.length,1,'prévia nunca apaga conta');
    });
  }finally{await db.close();}
});
