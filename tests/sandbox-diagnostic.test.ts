import {test} from 'node:test';
import assert from 'node:assert/strict';
import {sandboxDiagnostic} from '../src/lib/payments/sandbox-diagnostic';
import {AsaasApiError} from '../src/lib/payments/asaas.provider';
import {HttpError} from '../src/lib/http';

test('diagnóstico exige origem própria e autorização antes de consultar o Asaas',async()=>{
  const saved=process.env.NEXT_PUBLIC_APP_URL;process.env.NEXT_PUBLIC_APP_URL='https://www.hmpp.com.br';
  let probes=0,authorizations=0;
  const request=(origin?:string)=>new Request('https://www.hmpp.com.br/api/admin/asaas',{method:'POST',headers:origin?{origin}:{}});
  const probe=async()=>{probes++;};
  try{
    for(const origin of [undefined,'https://evil.example']){
      const response=await sandboxDiagnostic(request(origin),{authorize:async()=>{authorizations++;},probe});
      assert.equal(response.status,403);
    }
    assert.equal(authorizations,0);
    for(const status of [401,403]){
      const response=await sandboxDiagnostic(request('https://www.hmpp.com.br'),{authorize:async()=>{throw new HttpError(status,'Acesso negado.');},probe});
      assert.equal(response.status,status);
    }
    assert.equal(probes,0);
    const response=await sandboxDiagnostic(request('https://www.hmpp.com.br'),{authorize:async()=>{authorizations++;},probe});
    assert.equal(response.status,200);assert.equal(probes,1);assert.equal(authorizations,1);
    assert.match(response.headers.get('cache-control')!,/no-store/);
    assert.deepEqual(Object.keys(await response.json()),['message']);
    for(const status of [401,403,429,500]){
      const failed=await sandboxDiagnostic(request('https://www.hmpp.com.br'),{authorize:async()=>{},probe:async()=>{throw new AsaasApiError(status);}});
      assert.equal(failed.status,503);assert.equal('message' in await failed.json(),false);
    }
  }finally{if(saved===undefined)delete process.env.NEXT_PUBLIC_APP_URL;else process.env.NEXT_PUBLIC_APP_URL=saved;}
});
