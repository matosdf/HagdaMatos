import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readJson,secretMatches,requireOrigin} from '../src/lib/http';
test('webhook exige segredo definido, forte e correspondente',()=>{
  const secret='um-segredo-de-webhook-com-32-caracteres';
  assert.equal(secretMatches(secret,secret),true);
  assert.equal(secretMatches(null,secret),false);
  assert.equal(secretMatches('outro',secret),false);
  assert.equal(secretMatches('curto','curto'),false);
});
test('mutações rejeitam origem estrangeira e origem ausente',()=>{
  process.env.NEXT_PUBLIC_APP_URL='https://www.hagda.com.br';
  assert.doesNotThrow(()=>requireOrigin(new Request('https://www.hagda.com.br/api/checkout',{headers:{origin:'https://www.hagda.com.br'}})));
  assert.throws(()=>requireOrigin(new Request('https://www.hagda.com.br/api/checkout',{headers:{origin:'https://evil.example'}})));
  assert.throws(()=>requireOrigin(new Request('https://www.hagda.com.br/api/checkout')));
  delete process.env.NEXT_PUBLIC_APP_URL;
});
test('JSON inválido, tipo errado e corpo grande são rejeitados',async()=>{
  const req=(body:string,type='application/json')=>new Request('https://example.com',{method:'POST',headers:{'content-type':type},body});
  assert.deepEqual(await readJson(req('{"ok":true}')),{ok:true});
  await assert.rejects(()=>readJson(req('{')),/JSON inválido/);
  await assert.rejects(()=>readJson(req('{}','text/plain')),/Envie JSON/);
  await assert.rejects(()=>readJson(req('{"long":"1234567890"}'),5),/muito grande/);
});
