import 'server-only';
import { timingSafeEqual } from 'node:crypto';
import { z } from 'zod';
export class HttpError extends Error {
  constructor(public status: number, message: string) { super(message); }
}
export function requireOrigin(request: Request) {
  const expected = process.env.NEXT_PUBLIC_APP_URL;
  if (!expected) throw new HttpError(503, 'Endereço do site ainda não configurado.');
  if (request.headers.get('origin') !== new URL(expected).origin)
    throw new HttpError(403, 'Origem da solicitação inválida.');
}
export function secretMatches(received: string | null, expected: string | undefined) {
  if (!received || !expected || expected.length < 24) return false;
  const a = Buffer.from(received), b = Buffer.from(expected);
  return a.length === b.length && timingSafeEqual(a, b);
}
export async function readJson(request: Request, maxBytes = 32768) {
  if (!request.headers.get('content-type')?.includes('application/json'))
    throw new HttpError(415, 'Envie JSON.');
  const reader = request.body?.getReader();
  if (!reader) throw new HttpError(400, 'Corpo ausente.');
  const chunks: Uint8Array[] = []; let size = 0;
  try {
    while (true) {
      const { done, value } = await reader.read(); if (done) break;
      size += value.byteLength;
      if (size > maxBytes) { await reader.cancel(); throw new HttpError(413, 'Solicitação muito grande.'); }
      chunks.push(value);
    }
    return JSON.parse(Buffer.concat(chunks).toString('utf8'));
  } catch (error) {
    if (error instanceof HttpError) throw error;
    throw new HttpError(400, 'JSON inválido.');
  } finally { reader.releaseLock(); }
}
export function json(data: unknown, status = 200) {
  return Response.json(data, { status, headers: { 'Cache-Control': 'private, no-store' } });
}
export function failure(error: unknown) {
  if (error instanceof HttpError) return json({ error: error.message }, error.status);
  if (error instanceof z.ZodError) return json({ error: 'Confira os campos informados.' }, 400);
  console.error('Falha na operação:', error instanceof Error ? error.name : 'UnknownError');
  return json({ error: 'Não foi possível concluir. Tente novamente ou entre em contato com a HM.' }, 503);
}
