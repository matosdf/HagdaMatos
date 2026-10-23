import {test} from 'node:test';
import assert from 'node:assert/strict';
import {AsaasGateway} from '../src/lib/payments/asaas.provider';
test('adaptador cria assinatura sem dados de cartão e obtém fatura na cobrança',async()=>{
  const original=global.fetch;process.env.ASAAS_API_KEY='test-only-not-a-real-key';
  process.env.ASAAS_API_URL='https://api-sandbox.asaas.com/v3';
  const calls:{url:string;body:Record<string,unknown>|undefined}[]=[];
  global.fetch=async(input,init)=>{
    const url=String(input),body=init?.body?JSON.parse(String(init.body)):undefined;
    calls.push({url,body});
    return Response.json(url.endsWith('/customers')?{id:'cus_test'}:url.endsWith('/subscriptions')?{id:'sub_test'}:
      {data:[{dueDate:'2026-10-23',invoiceUrl:'https://sandbox.asaas.com/i/test'}]});
  };
  try{
    const result=await new AsaasGateway().createSubscription({reference:'attempt',userId:'member',email:'example@example.com',
      name:'Cliente de teste',cpfCnpj:'00000000000',phone:'11999999999',billingType:'CREDIT_CARD',amountCents:9700});
    assert.equal(result.providerSubscriptionId,'sub_test');assert.equal(result.paymentUrl,'https://sandbox.asaas.com/i/test');
    assert.equal(calls[1].body?.value,97);assert.equal(calls[1].body?.cycle,'MONTHLY');
    assert.equal(calls[1].body?.externalReference,'attempt');
    assert.equal(calls[1].body?.creditCard,undefined);assert.equal(calls.length,3);
  }finally{global.fetch=original;delete process.env.ASAAS_API_KEY;delete process.env.ASAAS_API_URL;}
});
test('produção exige opt-in e nenhuma requisição é enviada sem configuração',async()=>{
  let requested=false;const original=global.fetch;global.fetch=async()=>{requested=true;return Response.json({});};
  process.env.ASAAS_API_URL='https://api.asaas.com/v3';delete process.env.ASAAS_ALLOW_PRODUCTION;
  try{await assert.rejects(()=>new AsaasGateway().cancelSubscription('sub_test'),/produção/);assert.equal(requested,false);}
  finally{global.fetch=original;delete process.env.ASAAS_API_URL;}
});
test('estado consultado no provedor prevalece sobre uma confirmação antiga',async()=>{
  const original=global.fetch;process.env.ASAAS_API_KEY='test-only';
  global.fetch=async()=>Response.json({id:'pay_test',subscription:'sub_test',customer:'cus_test',status:'REFUNDED',value:97,dueDate:'2026-01-31'});
  try{const snapshot=await new AsaasGateway().getPayment('pay_test');assert.equal(snapshot.state,'revoked');assert.equal(snapshot.periodEnd,'2026-02-28T03:00:00.000Z');}
  finally{global.fetch=original;delete process.env.ASAAS_API_KEY;}
});
