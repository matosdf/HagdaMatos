export interface CancelableSubscription {
  id: string;
  provider_subscription_id: string;
  provider_canceled: boolean;
  cancellation_requested_at: string | null;
}

export type CancellationSummary = Pick<CancelableSubscription, 'provider_canceled' | 'cancellation_requested_at'>;

export function cancellationState(subscription: CancellationSummary | null) {
  if (!subscription) return 'none';
  if (subscription.provider_canceled) return 'canceled';
  if (subscription.cancellation_requested_at) return 'pending';
  return 'available';
}

export async function requestCancellation(
  subscription: CancelableSubscription | null,
  cancelAtProvider: (id: string) => Promise<void>,
  recordRequest: (id: string) => Promise<void>,
) {
  const state = cancellationState(subscription);
  if (state !== 'available' || !subscription) return state;
  await cancelAtProvider(subscription.provider_subscription_id);
  await recordRequest(subscription.id);
  return 'pending';
}
