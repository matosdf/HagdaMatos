import { test } from 'node:test';
import assert from 'node:assert/strict';
import { confirmationDestination } from '../src/lib/auth-confirm';

test('primeiro clique da troca segura orienta segundo e-mail sem tentar criar sessão', async () => {
  const params=new URLSearchParams({message:'Confirmation link accepted. Please proceed to confirm link sent to the other email'});
  assert.equal(await confirmationDestination(params,async()=>{throw new Error('Não deveria trocar código');}),'/login?confirmacao=email-pendente');
});

test('confirmação com código válido mantém retorno de conta e recuperação e bloqueia destino externo', async () => {
  for(const [next,expected] of [['/conta/nova-senha','/conta/nova-senha'],['https://evil.example','/conta'],['/admin','/conta']]) {
    let calls=0;
    assert.equal(await confirmationDestination(new URLSearchParams({code:'codigo-de-teste',next}),async code=>{calls++;assert.equal(code,'codigo-de-teste');return true;}),expected);
    assert.equal(calls,1);
  }
});

test('link inválido ou erro real não é tratado como primeira confirmação nem reflete texto externo', async () => {
  for(const params of [new URLSearchParams(),new URLSearchParams({message:'texto arbitrário'}),new URLSearchParams({error_code:'otp_expired',message:'Confirmation link accepted. Please proceed to confirm link sent to the other email'})]) {
    assert.equal(await confirmationDestination(params,async()=>{throw new Error('Não deveria trocar código');}),'/login?confirmacao=erro');
  }
  assert.equal(await confirmationDestination(new URLSearchParams({code:'invalido'}),async()=>false),'/login?confirmacao=erro');
});
