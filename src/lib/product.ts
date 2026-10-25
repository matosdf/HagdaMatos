/** Decisões comerciais aprovadas em 24/10/2026. Nenhuma credencial neste módulo. */
export const PRODUCT = {
  code: 'hm-presenca-180-v1',
  name: 'HM — Biblioteca de Presença',
  priceCents: 12900,
  daysPerPeriod: 30,
  maxPeriods: 6,
  retentionDays: 90,
  ownerEmail: 'matoshagda@gmail.com',
  siteUrl: 'https://www.hmpp.com.br',
  termsVersion: '2026-10-24-rascunho',
} as const;

export function totalPrice(periods: number) {
  if (!Number.isInteger(periods) || periods < 1 || periods > PRODUCT.maxPeriods)
    throw new Error('Escolha entre um e seis períodos.');
  return periods * PRODUCT.priceCents;
}
