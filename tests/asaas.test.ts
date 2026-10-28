import {test} from 'node:test';
import assert from 'node:assert/strict';
import {AsaasGateway} from '../src/lib/payments/asaas.provider';
test('adaptador não cria mês de calendário como se fosse 30 dias nem repete total antecipado',async()=>{
  const original=global.fetch;let calls=0;
  global.fetch=async()=>{calls++;return Response.json({});};
  try{
    for(const billingType of ['CREDIT_CARD','PIX'] as const){
      const input={reference:'attempt',userId:'member',email:'example@example.com',
        name:'Cliente de teste',cpfCnpj:'00000000000',phone:'11999999999',billingType,amountCents:12900};
      await assert.rejects(()=>new AsaasGateway().createSubscription(input),/30 dias exatos/);
      await assert.rejects(()=>new AsaasGateway().createSubscription({...input,amountCents:25800}),/sem multiplicação/);
    }
    assert.equal(calls,0);
  }finally{global.fetch=original;}
});
test('produção exige opt-in e nenhuma requisição é enviada sem configuração',async()=>{
  let requested=false;const original=global.fetch;global.fetch=async()=>{requested=true;return Response.json({});};
  process.env.ASAAS_API_URL='https://api.asaas.com/v3';delete process.env.ASAAS_ALLOW_PRODUCTION;
  try{await assert.rejects(()=>new AsaasGateway().cancelSubscription('sub_test'),/produção/);assert.equal(requested,false);}
  finally{global.fetch=original;delete process.env.ASAAS_API_URL;}
});
test('estado consultado no provedor prevalece sobre uma confirmação antiga',async()=>{
  const original=global.fetch;process.env.ASAAS_API_KEY='test-only';
  global.fetch=async()=>Response.json({id:'pay_test',subscription:'sub_test',customer:'cus_test',status:'REFUNDED',value:129,billingType:'CREDIT_CARD',dueDate:'2026-01-31'});
  try{const snapshot=await new AsaasGateway().getPayment('pay_test');assert.equal(snapshot.state,'revoked');assert.equal(snapshot.paidAt,null);assert.equal('periodEnd' in snapshot,false);}
  finally{global.fetch=original;delete process.env.ASAAS_API_KEY;}
});

test('pagamento normalizado usa confirmação do cartão e liquidação do Pix, nunca vencimento',async()=>{
  const original=global.fetch;const saved=process.env.ASAAS_API_KEY;process.env.ASAAS_API_KEY='test-only';
  const payment={id:'pay_test',subscription:'sub_test',customer:'cus_test',status:'CONFIRMED',value:129,
    billingType:'CREDIT_CARD',dueDate:'2026-01-01',confirmedDate:'2026-01-31',paymentDate:'2026-03-04',creditDate:'2026-03-04'};
  try{
    global.fetch=async()=>Response.json(payment);
    const confirmed=await new AsaasGateway().getPayment('pay_test');
    assert.equal(confirmed.paidAt,'2026-01-31T03:00:00.000Z');
    global.fetch=async()=>Response.json({...payment,status:'RECEIVED'});
    assert.equal((await new AsaasGateway().getPayment('pay_test')).paidAt,confirmed.paidAt);
    global.fetch=async()=>Response.json({...payment,billingType:'PIX',status:'RECEIVED',paymentDate:'2026-02-02'});
    assert.equal((await new AsaasGateway().getPayment('pay_test')).paidAt,'2026-02-02T03:00:00.000Z');
    for(const extra of [{confirmedDate:null},{confirmedDate:'2026-02-30'},{id:'pay_other'},{billingType:'BOLETO'},{value:129.001}]){
      global.fetch=async()=>Response.json({...payment,...extra});
      await assert.rejects(()=>new AsaasGateway().getPayment('pay_test'));
    }
    global.fetch=async()=>Response.json({...payment,status:'PENDING',confirmedDate:null});
    assert.equal((await new AsaasGateway().getPayment('pay_test')).paidAt,null);
  }finally{global.fetch=original;if(saved===undefined)delete process.env.ASAAS_API_KEY;else process.env.ASAAS_API_KEY=saved;}
});

test('diagnóstico consulta só Sandbox e não expõe clientes nem cria recursos',async()=>{
  const original=global.fetch;
  const saved={key:process.env.ASAAS_API_KEY,url:process.env.ASAAS_API_URL,env:process.env.VERCEL_ENV,allow:process.env.ASAAS_ALLOW_PRODUCTION};
  process.env.ASAAS_API_KEY='test-only';process.env.ASAAS_API_URL='https://api-sandbox.asaas.com/v3';process.env.VERCEL_ENV='preview';
  const calls:{url:string;method:string}[]=[];
  global.fetch=async(url,options)=>{calls.push({url:String(url),method:options?.method as string});return Response.json({data:[{name:'Não retornar',cpfCnpj:'Não retornar'}],totalCount:1});};
  try{
    assert.equal(await new AsaasGateway().checkSandboxConnection(),undefined);
    assert.deepEqual(calls,[{url:'https://api-sandbox.asaas.com/v3/customers?limit=1',method:'GET'}]);
    process.env.ASAAS_API_URL='https://api.asaas.com/v3';process.env.ASAAS_ALLOW_PRODUCTION='true';
    await assert.rejects(()=>new AsaasGateway().checkSandboxConnection(),/Sandbox/);
    process.env.ASAAS_API_URL='https://api-sandbox.asaas.com/v3';process.env.VERCEL_ENV='production';
    await assert.rejects(()=>new AsaasGateway().checkSandboxConnection(),/Sandbox/);
    assert.equal(calls.length,1);
  }finally{
    global.fetch=original;
    for(const [key,value] of Object.entries({ASAAS_API_KEY:saved.key,ASAAS_API_URL:saved.url,VERCEL_ENV:saved.env,ASAAS_ALLOW_PRODUCTION:saved.allow})){
      if(value===undefined)delete process.env[key];else process.env[key]=value;
    }
  }
});
