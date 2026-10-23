export function addCalendarMonth(date: string): string {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) throw new Error('Data de cobrança inválida.');
  const [y, m, d] = date.split('-').map(Number);
  const parsed = new Date(Date.UTC(y, m - 1, d));
  if (parsed.toISOString().slice(0, 10) !== date) throw new Error('Data de cobrança inválida.');
  const lastDay = new Date(Date.UTC(y, m + 1, 0)).getUTCDate();
  return new Date(Date.UTC(y, m, Math.min(d, lastDay))).toISOString().slice(0, 10);
}

export function hasAccess(subscription: { status: string; current_period_end: string | null } | null, now = Date.now()) {
  return subscription?.status === 'active' && !!subscription.current_period_end &&
    Date.parse(subscription.current_period_end) > now;
}

