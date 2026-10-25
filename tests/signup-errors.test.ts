import {test} from 'node:test';
import assert from 'node:assert/strict';
import {signupFailure} from '../src/lib/signup-errors';
test('cadastro distingue restrição do SMTP, limites e senha sem repetir tentativas',()=>{
  const mail=signupFailure({code:'email_address_not_authorized',status:403});
  assert.equal(mail.status,503);assert.match(mail.message,/envio de e-mails precisa ser configurado/);
  for(const code of ['over_email_send_rate_limit','over_request_rate_limit'])assert.equal(signupFailure({code,status:429}).status,429);
  assert.equal(signupFailure({code:'signup_disabled',status:422}).status,503);
  assert.equal(signupFailure({code:'weak_password',status:422}).status,400);
});
test('diagnóstico descarta mensagens, códigos desconhecidos e valores potencialmente secretos',()=>{
  const secret='example-secret-test-only';
  const error={code:secret,status:403,message:'email@example.invalid password='+secret};
  const result=signupFailure(error);
  assert.equal(result.diagnostic.code,'unclassified');assert.ok(!JSON.stringify(result).includes(secret));
  assert.ok(!JSON.stringify(result).includes('email@example.invalid'));
  assert.equal(signupFailure({code:'__proto__',status:NaN}).diagnostic.code,'unclassified');
  assert.equal(signupFailure({status:429}).status,429);
});
test('cadastro não confirma a existência de um e-mail já registrado',()=>{
  const exists=signupFailure({code:'user_already_exists',status:422});
  const unknown=signupFailure({code:'future_error',status:422});
  assert.equal(exists.message,unknown.message);assert.equal(exists.diagnostic.code,'unclassified');
});
