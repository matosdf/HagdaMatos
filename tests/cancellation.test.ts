import { test } from 'node:test';
import assert from 'node:assert/strict';
import { cancellationState, requestCancellation } from '../src/lib/cancellation';

const subscription={id:'internal-id',provider_subscription_id:'sub-test',provider_canceled:false,cancellation_requested_at:null};

test('cancelamento chama provedor e registra solicitação, sem alterar créditos pagos',async()=>{
  const events:string[]=[];
  assert.equal(await requestCancellation(subscription,async id=>{events.push(`cancel:${id}`);},async id=>{events.push(`record:${id}`);}), 'pending');
  assert.deepEqual(events,['cancel:sub-test','record:internal-id']);
});

test('solicitação já registrada ou assinatura cancelada não envia novo pedido',async()=>{
  const unexpected=async()=>{throw new Error('Não deveria chamar o provedor nem gravar novamente');};
  assert.equal(await requestCancellation(null,unexpected,unexpected),'none');
  assert.equal(await requestCancellation({...subscription,provider_canceled:true},unexpected,unexpected),'canceled');
  assert.equal(await requestCancellation({...subscription,cancellation_requested_at:'2026-10-25T12:00:00Z'},unexpected,unexpected),'pending');
  assert.equal(cancellationState(subscription),'available');
});

test('falha do provedor não registra cancelamento como solicitado',async()=>{
  let recorded=false;
  await assert.rejects(()=>requestCancellation(subscription,async()=>{throw new Error('Provedor indisponível');},async()=>{recorded=true;}),/Provedor indisponível/);
  assert.equal(recorded,false);
});
