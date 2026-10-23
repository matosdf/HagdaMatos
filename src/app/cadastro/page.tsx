import { AuthForm } from '@/components/forms';
import { SetupNotice } from '@/components/setup-notice';
import { authConfigured } from '@/lib/supabase/server';
export const dynamic='force-dynamic';
export default function Cadastro(){return <><p className="member-kicker">Um novo começo</p><h1>Crie sua <em>conta.</em></h1><p>O cadastro permite gerenciar sua assinatura. Os vídeos são liberados após a confirmação do pagamento.</p>
  <div className="member-card narrow">{authConfigured()&&process.env.REGISTRATION_ENABLED==='true'?<AuthForm mode="cadastro"/>:<SetupNotice/>}<div className="member-actions"><a href="/login">Já tenho uma conta</a></div></div></>;}
