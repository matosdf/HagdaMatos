// Supabase Auth verify.go: a primeira confirmação da troca segura não gera sessão.
// Este aviso só orienta a interface; nunca concede acesso ou confirma a troca no banco.
const firstEmailConfirmation = 'Confirmation link accepted. Please proceed to confirm link sent to the other email';

export async function confirmationDestination(
  params: URLSearchParams,
  exchangeCode: (code: string) => Promise<boolean>,
) {
  if (params.has('error') || params.has('error_code')) return '/login?confirmacao=erro';
  const code = params.get('code');
  if (code) {
    if (await exchangeCode(code))
      return params.get('next') === '/conta/nova-senha' ? '/conta/nova-senha' : '/conta';
    return '/login?confirmacao=erro';
  }
  if (params.get('message') === firstEmailConfirmation)
    return '/login?confirmacao=email-pendente';
  return '/login?confirmacao=erro';
}
