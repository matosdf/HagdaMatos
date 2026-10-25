import { AuthForm } from '@/components/forms';
import { SetupNotice } from '@/components/setup-notice';
import { authConfigured } from '@/lib/supabase/server';
export default async function Login({searchParams}:{searchParams:Promise<{confirmacao?:string}>}){
  const {confirmacao}=await searchParams;
  return <><div className="member-intro"><p className="member-kicker">Sua presença continua aqui</p><h1>Bem-vinda ao seu <em>espaço.</em></h1><p>Entre para acompanhar sua assinatura e acessar os conteúdos da consultoria.</p></div>
    <div className="member-card narrow">{confirmacao==='erro' && <div role="alert">
      <p>Não foi possível concluir a validação deste link. Ele pode ter expirado, já ter sido usado ou ter sido aberto em outro navegador.</p>
      <p>Se você está trocando seu e-mail, clique no link recebido em cada endereço: o antigo e o novo. Se já confirmou os dois, tente entrar com o novo e-mail. Sua senha continua a mesma.</p>
      <p>Se ainda precisar de ajuda, abra Minha conta para conferir o endereço atual e a alteração pendente. Solicite outro link de recuperação apenas se estiver tentando redefinir sua senha.</p>
    </div>}
      {confirmacao==='email-pendente' && <div role="status">
        <h2>Falta confirmar no outro e-mail</h2>
        <p>Para concluir a troca, é necessário clicar nos dois links de confirmação: um enviado ao endereço antigo e outro ao novo.</p>
        <p>Agora abra a outra caixa de entrada e clique no link da mensagem da HM, usando este mesmo navegador. Confira também o spam.</p>
        <p>Depois de confirmar os dois, entre com o novo e-mail e sua senha habitual. Se já concluiu essa etapa em outra aba, você já pode tentar entrar abaixo.</p>
      </div>}
      {authConfigured()?<AuthForm mode="login"/>:<SetupNotice/>}
      <div className="member-actions"><a href="/recuperar-senha">Esqueci minha senha</a><a href="/cadastro">Criar uma conta</a></div></div></>;
}
