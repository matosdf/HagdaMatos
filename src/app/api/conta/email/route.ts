import { requireUser } from '@/lib/auth';
import { emailChangeSchema, isCurrentEmail } from '@/lib/email-change';
import { failure, HttpError, json, readJson, requireOrigin } from '@/lib/http';

export async function POST(request: Request) {
  try {
    requireOrigin(request);
    const { supabase, user } = await requireUser();
    const input = emailChangeSchema.parse(await readJson(request));
    if (isCurrentEmail(input.email, user.email))
      throw new HttpError(400, 'Informe um endereço diferente do seu e-mail atual.');

    const { error } = await supabase.auth.updateUser({ email: input.email }, {
      emailRedirectTo: new URL('/auth/confirm', process.env.NEXT_PUBLIC_APP_URL!).href,
    });
    if (error) {
      if (error.status === 429)
        throw new HttpError(429, 'O limite de solicitações foi atingido. Aguarde antes de tentar novamente.');
      throw new HttpError(400, 'Não foi possível solicitar a alteração. Confira o endereço ou tente novamente mais tarde.');
    }
    return json({ message: 'Solicitação enviada. Confira o novo e-mail e o atual: pode ser necessário confirmar nos dois endereços. Após concluir, atualize esta página para conferir o e-mail da conta.' });
  } catch (error) { return failure(error); }
}
