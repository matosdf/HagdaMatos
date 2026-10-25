export type BillingType = 'PIX' | 'CREDIT_CARD';
export type PaymentState = 'pending' | 'paid' | 'overdue' | 'revoked';
export interface CreateCheckoutInput {
  reference: string; userId: string; email: string; name: string; cpfCnpj: string;
  phone: string; billingType: BillingType; amountCents: number; customerId?: string;
}
export interface CheckoutResponse {
  providerCustomerId: string; providerSubscriptionId: string; paymentUrl: string;
}
export interface PaymentSnapshot {
  subscriptionId: string; customerId: string; paymentId: string; state: PaymentState;
  amountCents: number; periodStart: string; periodEnd: string; observedAt: string;
}
export interface PaymentGateway {
  createSubscription(input: CreateCheckoutInput): Promise<CheckoutResponse>;
  cancelSubscription(id: string): Promise<void>;
  getPaymentUrl(subscriptionId: string): Promise<string>;
  getPayment(id: string): Promise<PaymentSnapshot>;
  getSubscription(id: string): Promise<{ id: string; customerId: string; canceled: boolean; reference?: string }>;
}
