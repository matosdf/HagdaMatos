import 'server-only';
import { serverClient } from './supabase/server';
import { HttpError } from './http';
// Consulta da própria conta e cancelamento continuam disponíveis mesmo se o
// acesso aos conteúdos foi bloqueado. Não usar esta função para biblioteca/admin.
export async function requireAccountUser() {
  const supabase = await serverClient();
  const { data: { user }, error } = await supabase.auth.getUser();
  if (error || !user) throw new HttpError(401, 'Entre na sua conta.');
  const { data: profile, error: profileError } = await supabase.from('member_profiles')
    .select('full_name,is_owner,is_disabled').eq('user_id', user.id).single();
  if (profileError || !profile) throw new HttpError(403, 'Conta indisponível. Contate a HM.');
  return { supabase, user, profile };
}
export async function requireUser(owner = false) {
  const session = await requireAccountUser();
  if (session.profile.is_disabled) throw new HttpError(403, 'Conta indisponível. Contate a HM.');
  if (owner && !session.profile.is_owner) throw new HttpError(403, 'Acesso restrito à administração.');
  return session;
}
