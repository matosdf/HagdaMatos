import type { PaymentState } from './types';

// O Asaas informa datas civis (sem hora) nestes campos. A convenção local
// é início do dia em UTC-03:00; não é o instante exato da transação.
// Nunca usar vencimento, data do webhook ou data de crédito do cartão.
export function asaasPaidAt(payment: {
  billingType: 'PIX' | 'CREDIT_CARD'; confirmedDate?: string | null; paymentDate?: string | null;
}): string {
  // paymentDate é liquidação e pode ocorrer semanas depois no cartão.
  const date = payment.billingType === 'CREDIT_CARD' ? payment.confirmedDate : payment.paymentDate;
  if (!date || !/^\d{4}-\d{2}-\d{2}$/.test(date))
    throw new Error('Data efetiva do pagamento ausente ou inválida. Requer conciliação.');
  const parsed = new Date(`${date}T00:00:00.000Z`);
  if (!Number.isFinite(parsed.getTime()) || parsed.toISOString().slice(0, 10) !== date)
    throw new Error('Data efetiva do pagamento inválida. Requer conciliação.');
  return new Date(`${date}T00:00:00.000-03:00`).toISOString();
}

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
