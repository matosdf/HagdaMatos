import 'server-only';
import { createClient } from '@supabase/supabase-js';
// Importar somente de Route Handlers. Nunca usar no cliente nem em Server Components.
export function adminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error('Backend Supabase ainda não configurado.');
  return createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
}
