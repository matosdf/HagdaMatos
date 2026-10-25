import { test } from 'node:test';
import assert from 'node:assert/strict';
import { emailChangeSchema, isCurrentEmail } from '../src/lib/email-change';

test('troca de e-mail rejeita endereços inválidos e confirmação diferente no servidor', () => {
  assert.equal(emailChangeSchema.safeParse({email:'invalido',confirmEmail:'invalido'}).success,false);
  assert.equal(emailChangeSchema.safeParse({email:'a@example.com',confirmEmail:'b@example.com'}).success,false);
  assert.equal(emailChangeSchema.safeParse({email:'a@example.com'}).success,false);
});

test('normalização impede solicitar o endereço atual variando espaços e maiúsculas', () => {
  const input=emailChangeSchema.parse({email:' NOVO@EXAMPLE.COM ',confirmEmail:'novo@example.com'});
  assert.equal(input.email,'novo@example.com');
  assert.equal(isCurrentEmail(input.email,'Novo@example.com'),true);
  assert.equal(isCurrentEmail(input.email,'atual@example.com'),false);
});
