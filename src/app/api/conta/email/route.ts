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
    return json({ message: 'Solicitação enviada. Falta confirmar a troca nos DOIS endereços: abra a mensagem no e-mail atual e clique no botão de confirmação; depois faça o mesmo no novo e-mail. A ordem não importa. Confirmar apenas um link não conclui a troca. Use o mesmo navegador e confira o spam. Após confirmar ambos, atualize Minha conta ou entre com o novo e-mail e a mesma senha.' });
  } catch (error) { return failure(error); }
}
