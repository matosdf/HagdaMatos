import 'server-only';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { publicSupabaseConfig } from './public-config';
export function authConfigured() {
  const {url,key}=publicSupabaseConfig();return !!(url&&key);
}
export async function serverClient() {
  if (!authConfigured()) throw new Error('Supabase ainda não configurado.');
  const store = await cookies();
  const {url,key}=publicSupabaseConfig();
  return createServerClient(url!, key!, {
    cookies: { getAll: () => store.getAll(), setAll(values) {
      try { values.forEach(({ name, value, options }) => store.set(name, value, options)); }
      catch { /* Server Components: renovação realizada pelo proxy. */ }
    } },
  });
}
