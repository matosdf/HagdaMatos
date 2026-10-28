import {test} from 'node:test';
import assert from 'node:assert/strict';
import {POST} from '../src/app/api/webhooks/asaas/route';

test('webhook desabilitado ou sem token próprio válido falha antes de acessar provedor e banco',async()=>{
  const keys=['ASAAS_INTEGRATION_READY','ASAAS_WEBHOOK_SECRET','ASAAS_API_KEY'] as const;
  const saved=Object.fromEntries(keys.map(key=>[key,process.env[key]]));
  const original=global.fetch;let calls=0;global.fetch=async()=>{calls++;throw new Error('Não deve consultar recursos');};
  const secret='test-only-webhook-secret-32-characters';
  const request=(token?:string,body='{}')=>new Request('https://www.hmpp.com.br/api/webhooks/asaas',{
    method:'POST',headers:{'content-type':'application/json',...(token?{'asaas-access-token':token}:{})},body});
  try{
    process.env.ASAAS_INTEGRATION_READY='false';
    assert.equal((await POST(request(secret))).status,503);
    process.env.ASAAS_INTEGRATION_READY='true';
    for(const token of ['', 'a'.repeat(24),'a'.repeat(256),'a'.repeat(32)+' ']){
      process.env.ASAAS_WEBHOOK_SECRET=token;
      assert.equal((await POST(request(token))).status,503);
    }
    process.env.ASAAS_API_KEY=secret;process.env.ASAAS_WEBHOOK_SECRET=secret;
    assert.equal((await POST(request(secret))).status,503);
    process.env.ASAAS_API_KEY='test-only-api-key';
    for(const token of [undefined,'wrong'])assert.equal((await POST(request(token))).status,401);
    assert.equal((await POST(request(secret,'{'))).status,400);
    assert.equal(calls,0);
  }finally{
    global.fetch=original;
    for(const key of keys){if(saved[key]===undefined)delete process.env[key];else process.env[key]=saved[key];}
  }
});
