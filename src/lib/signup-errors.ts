type ProviderError = { code?: unknown; status?: unknown };
const known: Record<string, { status: number; message: string }> = {
  email_address_not_authorized: {
    status: 503,
    message: 'Não conseguimos enviar a confirmação para este endereço. O envio de e-mails precisa ser configurado pela HM.',
  },
  over_email_send_rate_limit: {
    status: 429,
    message: 'O limite de envio de e-mails foi atingido. Aguarde antes de tentar novamente.',
  },
  over_request_rate_limit: {
    status: 429,
    message: 'Houve muitas tentativas em pouco tempo. Aguarde alguns minutos antes de tentar novamente.',
  },
  signup_disabled: {
    status: 503,
    message: 'Novos cadastros ainda não estão disponíveis. Entre em contato com a HM.',
  },
  email_provider_disabled: {
    status: 503,
    message: 'O cadastro por e-mail ainda não está disponível. Entre em contato com a HM.',
  },
  email_address_invalid: {
    status: 400,
    message: 'Confira o endereço de e-mail informado.',
  },
  weak_password: {
    status: 400,
    message: 'A senha não atende aos requisitos de segurança. Use pelo menos 12 caracteres, com letras, números e símbolos.',
  },
  captcha_failed: {
    status: 400,
    message: 'Não foi possível validar a verificação de segurança. Entre em contato com a HM.',
  },
  unexpected_failure: {
    status: 503,
    message: 'O serviço de cadastro encontrou um problema. Entre em contato com a HM antes de tentar novamente.',
  },
};

/** Nunca retornar nem registrar error.message: pode conter e-mail ou outros dados. */
export function signupFailure(error: ProviderError) {
  const code = typeof error.code === 'string' && Object.hasOwn(known, error.code)
    ? error.code : 'unclassified';
  const upstreamStatus = typeof error.status === 'number' && Number.isInteger(error.status)
    && error.status >= 400 && error.status <= 599 ? error.status : undefined;
  const mapped = known[code];
  return {
    status: mapped?.status ?? (upstreamStatus === 429 ? 429 : 400),
    message: mapped?.message ?? 'Não foi possível concluir o cadastro. Se já possui conta, entre ou recupere a senha. Caso contrário, entre em contato com a HM.',
    diagnostic: { code, status: upstreamStatus },
  };
}
