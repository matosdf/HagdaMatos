import { test } from 'node:test';
import assert from 'node:assert/strict';
import { billingTypeSchema, checkoutTerms, recurringScheduleReady } from '../src/lib/payments/policy';

test('somente Pix e cartão são aceitos, inclusive fora da interface',()=>{
  for(const method of ['PIX','CREDIT_CARD'])assert.equal(billingTypeSchema.safeParse(method).success,true);
  for(const method of ['UNDEFINED','BOLETO','',null])assert.equal(billingTypeSchema.safeParse(method).success,false);
});

test('60 dias recorrentes são duas cobranças de 129, com apenas 30 dias liberados inicialmente',()=>{
  const terms=checkoutTerms(2,'recorrente');
  assert.equal(terms.selectedTotalCents,25800);
  assert.equal(terms.initialAmountCents,12900);
  assert.equal(terms.initialAccessDays,30);
  assert.equal(terms.firstRenewalAfterDays,30);
  assert.equal(terms.remainingRenewals,1);
});

test('60 dias antecipados são 258 uma vez e só renovam por 129 após o saldo',()=>{
  const terms=checkoutTerms(2,'antecipado');
  assert.equal(terms.initialAmountCents,25800);
  assert.equal(terms.initialAccessDays,60);
  assert.equal(terms.firstRenewalAfterDays,60);
  assert.equal(terms.renewalAmountCents,12900);
  assert.equal(terms.renewalIntervalDays,30);
  assert.equal(terms.remainingRenewals,4);
});

test('até seis períodos nunca multiplicam valor/intervalo das renovações; antecipar seis encerra o produto',()=>{
  for(let n=1;n<=6;n++)for(const mode of ['recorrente','antecipado'] as const){
    const terms=checkoutTerms(n,mode);
    assert.equal(terms.renewalAmountCents,12900);
    assert.equal(terms.renewalIntervalDays,30);
    assert.equal(terms.initialAmountCents+terms.remainingRenewals*terms.renewalAmountCents,mode==='antecipado'?77400:n*12900);
  }
  assert.equal(checkoutTerms(6,'antecipado').remainingRenewals,0);
  for(const n of [0,7,1.5])assert.throws(()=>checkoutTerms(n));
  assert.equal(recurringScheduleReady(),false);
});
