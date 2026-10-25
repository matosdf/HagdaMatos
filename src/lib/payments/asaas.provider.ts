import 'server-only';
import { z } from 'zod';
import { addCalendarMonth } from './domain';
import { normalizePaymentState, validInvoiceUrl } from './asaas-data';
import { billingTypeSchema, recurringSchedulePending } from './policy';
import { PRODUCT } from '../product';
import type { CheckoutResponse, CreateCheckoutInput, PaymentGateway, PaymentSnapshot } from './types';

const idSchema = z.string().min(1).max(150).regex(/^[a-zA-Z0-9_-]+$/);
const paymentSchema = z.object({
  id: idSchema, subscription: idSchema, customer: idSchema, status: z.string(),
  value: z.number().nonnegative(), dueDate: z.string(), deleted: z.boolean().optional(),
  refunds: z.array(z.unknown()).nullish(),
});

export class AsaasApiError extends Error {
  constructor(public status:number){super(`Falha no provedor de pagamento (${status}).`);}
}

export class AsaasGateway implements PaymentGateway {
  private async request(path: string, method = 'GET', body?: unknown) {
    const base = process.env.ASAAS_API_URL || 'https://api-sandbox.asaas.com/v3';
    if (!['https://api-sandbox.asaas.com/v3', 'https://api.asaas.com/v3'].includes(base))
      throw new Error('ASAAS_API_URL inválida. Use a URL oficial do ambiente.');
    if (base === 'https://api.asaas.com/v3' && process.env.ASAAS_ALLOW_PRODUCTION !== 'true')
      throw new Error('Cobranças em produção ainda não foram habilitadas.');
    const key = process.env.ASAAS_API_KEY;
    if (!key) throw new Error('Asaas não configurado.');
    const response = await fetch(`${base}${path}`, {
      method, cache: 'no-store', signal: AbortSignal.timeout(12000),
      headers: { access_token: key, 'Content-Type': 'application/json', 'User-Agent': 'HM-Membros/1.0' },
      ...(body ? { body: JSON.stringify(body) } : {}),
    });
    // Não registrar respostas brutas: podem conter dados pessoais ou financeiros.
    if (!response.ok) throw new AsaasApiError(response.status);
    return response.json();
  }

  async createSubscription(input: CreateCheckoutInput): Promise<CheckoutResponse> {
    billingTypeSchema.parse(input.billingType);
    if (input.amountCents !== PRODUCT.priceCents)
      throw new Error('A renovação deve ser de R$ 129,00 por período, sem multiplicação pela antecipação.');
    // MONTHLY é mês de calendário, não 30 dias. Não enviar uma assinatura
    // incompatível, mesmo se alguém habilitar as flags antes da homologação.
    // Antecipação deverá usar cobrança única e reagendar pelo saldo confirmado,
    // considerando também os períodos já comprados para encerrar o produto.
    throw new Error(recurringSchedulePending);
  }

  async cancelSubscription(id: string) {
    await this.request(`/subscriptions/${encodeURIComponent(idSchema.parse(id))}`, 'DELETE');
  }

  async getPaymentUrl(subscriptionId: string) {
    const list=await this.request(`/subscriptions/${encodeURIComponent(idSchema.parse(subscriptionId))}/payments?limit=100&status=PENDING`);
    const overdue=await this.request(`/subscriptions/${encodeURIComponent(idSchema.parse(subscriptionId))}/payments?limit=100&status=OVERDUE`);
    const invoices=z.array(z.object({dueDate:z.string(),invoiceUrl:z.string()})).parse([...overdue.data,...list.data]);
    const invoice=invoices.sort((a,b)=>a.dueDate.localeCompare(b.dueDate))[0];
    if(!invoice)throw new Error('Nenhuma cobrança pendente disponível.');
    return validInvoiceUrl(invoice.invoiceUrl);
  }

  async getSubscription(id: string) {
    const data = await this.request(`/subscriptions/${encodeURIComponent(idSchema.parse(id))}`);
    return { id: idSchema.parse(data.id), customerId: idSchema.parse(data.customer),reference:typeof data.externalReference==='string'?data.externalReference:undefined,
      canceled: data.deleted === true || ['INACTIVE', 'EXPIRED'].includes(data.status) };
  }

  async getPayment(id: string): Promise<PaymentSnapshot> {
    const observedAt = new Date().toISOString();
    const data = paymentSchema.parse(await this.request(`/payments/${encodeURIComponent(idSchema.parse(id))}`));
    const periodEnd = addCalendarMonth(data.dueDate);
    return { subscriptionId: data.subscription, customerId: data.customer, paymentId: data.id,
      state: normalizePaymentState(data.status, data.deleted, !!data.refunds?.length),
      amountCents: Math.round(data.value * 100),
      // Vigência ancorada no vencimento, sem estender acesso ao repetir notificações.
      periodStart: `${data.dueDate}T03:00:00.000Z`, periodEnd: `${periodEnd}T03:00:00.000Z`, observedAt };
  }
}
