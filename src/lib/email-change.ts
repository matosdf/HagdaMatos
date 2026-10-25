import { z } from 'zod';

const email = z.string().trim().toLowerCase().pipe(z.email().max(200));
export const emailChangeSchema = z.object({
  email,
  confirmEmail: email,
}).refine(input => input.email === input.confirmEmail, {
  message: 'Os endereços de e-mail devem ser iguais.',
  path: ['confirmEmail'],
});

export function isCurrentEmail(next: string, current: string | undefined) {
  return next === current?.trim().toLowerCase();
}
