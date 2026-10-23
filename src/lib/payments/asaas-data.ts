import type { PaymentState } from './types';

export function normalizePaymentState(status: string, deleted = false, hasRefund = false): PaymentState {
  if (deleted || hasRefund || ['REFUNDED', 'REFUND_REQUESTED', 'REFUND_IN_PROGRESS',
    'CHARGEBACK_REQUESTED', 'CHARGEBACK_DISPUTE', 'AWAITING_CHARGEBACK_REVERSAL'].includes(status)) return 'revoked';
  if (['CONFIRMED', 'RECEIVED'].includes(status)) return 'paid';
  if (status === 'OVERDUE') return 'overdue';
  return 'pending';
}

export function validInvoiceUrl(value: string): string {
  const url = new URL(value);
  if (url.protocol !== 'https:' || url.username || url.password ||
    !(url.hostname === 'asaas.com' || url.hostname.endsWith('.asaas.com')))
    throw new Error('Destino de pagamento inválido.');
  return url.toString();
}
