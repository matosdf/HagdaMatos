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
  global.fetch=async()=>Response.json({id:'pay_test',subscription:'sub_test',customer:'cus_test',status:'REFUNDED',value:97,dueDate:'2026-01-31'});
  try{const snapshot=await new AsaasGateway().getPayment('pay_test');assert.equal(snapshot.state,'revoked');assert.equal(snapshot.periodEnd,'2026-02-28T03:00:00.000Z');}
  finally{global.fetch=original;delete process.env.ASAAS_API_KEY;}
});
