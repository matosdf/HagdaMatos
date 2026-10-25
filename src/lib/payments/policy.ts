import { z } from 'zod';
import { PRODUCT, totalPrice } from '../product';

export const billingTypeSchema = z.enum(['PIX', 'CREDIT_CARD']);
export const paymentPlanSchema = z.enum(['recorrente', 'antecipado']);
export type PaymentPlan = z.infer<typeof paymentPlanSchema>;

// Só mudar após homologar o agendamento de 30 dias e o limite no provedor.
export function recurringScheduleReady(): boolean { return false; }

// Antecipação é uma compra única. Nunca multiplicar a renovação por esse N.
export function checkoutTerms(periods: number, paymentPlan: PaymentPlan = 'recorrente') {
  paymentPlanSchema.parse(paymentPlan);
  const selectedTotal = totalPrice(periods);
  const prepaid = paymentPlan === 'antecipado';
  return {
    selectedTotalCents: selectedTotal,
    initialAmountCents: prepaid ? selectedTotal : PRODUCT.priceCents,
    initialAccessDays: prepaid ? periods * PRODUCT.daysPerPeriod : PRODUCT.daysPerPeriod,
    renewalAmountCents: PRODUCT.priceCents,
    renewalIntervalDays: PRODUCT.daysPerPeriod,
    firstRenewalAfterDays: prepaid ? periods * PRODUCT.daysPerPeriod : PRODUCT.daysPerPeriod,
    remainingRenewals: prepaid ? PRODUCT.maxPeriods - periods : periods - 1,
  };
}

export const recurringSchedulePending =
  'A recorrência de 30 dias exatos e o agendamento após o saldo antecipado ainda precisam ser homologados no Asaas. Nenhuma cobrança foi criada.';
