import 'server-only';
import { AsaasGateway } from './asaas.provider';
import type { PaymentGateway } from './types';
export function paymentGateway(): PaymentGateway {
  if ((process.env.PAYMENT_PROVIDER || 'asaas') !== 'asaas') throw new Error('Provedor não implementado.');
  return new AsaasGateway();
}
