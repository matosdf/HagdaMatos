import { test } from 'node:test';
import assert from 'node:assert/strict';
import { addCalendarMonth,hasAccess } from '../src/lib/payments/domain';
import {normalizePaymentState,validInvoiceUrl} from '../src/lib/payments/asaas-data';
test('mês de vigência respeita fevereiro, ano bissexto e virada de ano',()=>{
  assert.equal(addCalendarMonth('2026-01-31'),'2026-02-28');
  assert.equal(addCalendarMonth('2028-01-31'),'2028-02-29');
  assert.equal(addCalendarMonth('2026-12-31'),'2027-01-31');
  assert.throws(()=>addCalendarMonth('2026-02-30'));
});
test('somente confirmação ou recebimento liberam pagamento',()=>{
  for(const state of ['CONFIRMED','RECEIVED'])assert.equal(normalizePaymentState(state),'paid');
  for(const state of ['PENDING','AUTHORIZED','AWAITING_RISK_ANALYSIS','NEW_STATE'])assert.equal(normalizePaymentState(state),'pending');
  assert.equal(normalizePaymentState('OVERDUE'),'overdue');
  for(const state of ['REFUNDED','CHARGEBACK_REQUESTED','CHARGEBACK_DISPUTE','AWAITING_CHARGEBACK_REVERSAL'])assert.equal(normalizePaymentState(state),'revoked');
  assert.equal(normalizePaymentState('CONFIRMED',true),'revoked');
  assert.equal(normalizePaymentState('RECEIVED',false,true),'revoked');
});
test('status ativo sozinho não basta: é necessário período ainda válido',()=>{
  const now=Date.parse('2026-10-23T12:00:00Z');
  assert.equal(hasAccess({status:'active',current_period_end:'2026-11-23T12:00:00Z'},now),true);
  assert.equal(hasAccess({status:'active',current_period_end:'2026-10-23T12:00:00Z'},now),false);
  assert.equal(hasAccess({status:'canceled',current_period_end:'2026-11-23T12:00:00Z'},now),false);
  assert.equal(hasAccess(null,now),false);
});
test('redirecionamento financeiro aceita apenas HTTPS do Asaas',()=>{
  assert.equal(validInvoiceUrl('https://www.asaas.com/i/test'),'https://www.asaas.com/i/test');
  for(const url of ['javascript:alert(1)','https://asaas.com.evil.example/i/x','https://evil.example','http://asaas.com','https://user:password@asaas.com/i/x'])assert.throws(()=>validInvoiceUrl(url));
});
