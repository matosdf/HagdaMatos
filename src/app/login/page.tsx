import { AuthForm } from '@/components/forms';
import { SetupNotice } from '@/components/setup-notice';
import { authConfigured } from '@/lib/supabase/server';
export default async function Login({searchParams}:{searchParams:Promise<{confirmacao?:string}>}){
  const {confirmacao}=await searchParams;
  return <><div className="member-intro"><p className="member-kicker">Sua presença continua aqui</p><h1>Bem-vinda ao seu <em>espaço.</em></h1><p>Entre para acompanhar sua assinatura e acessar os conteúdos da consultoria.</p></div>
    <div className="member-card narrow">{confirmacao==='erro' && <p role="alert">O link não pôde ser validado. Solicite um novo e-mail de recuperação.</p>}
      {authConfigured()?<AuthForm mode="login"/>:<SetupNotice/>}
      <div className="member-actions"><a href="/recuperar-senha">Esqueci minha senha</a><a href="/cadastro">Criar uma conta</a></div></div></>;
}
