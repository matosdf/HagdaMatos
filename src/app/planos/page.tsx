import { CheckoutForm } from '@/components/forms';
import { authConfigured } from '@/lib/supabase/server';
export const dynamic='force-dynamic';
export default function Planos(){
  const raw=process.env.SUBSCRIPTION_MONTHLY_PRICE;
  const price=raw&&Number(raw)>0?Number(raw).toLocaleString('pt-BR',{style:'currency',currency:'BRL'}):null;
  const terms=process.env.SUBSCRIPTION_TERMS_URL || '';
  const enabled=authConfigured()&&process.env.BILLING_ENABLED==='true'&&!!price&&!!terms&&!!process.env.ASAAS_API_KEY&&!!process.env.ASAAS_WEBHOOK_SECRET&&!!process.env.SUPABASE_SERVICE_ROLE_KEY;
  return <><div className="member-intro"><p className="member-kicker">Sua presença, em movimento</p><h1>Aprendizado que acompanha sua <em>evolução.</em></h1><p>Um espaço para acessar os conteúdos em vídeo da HM e seguir desenvolvendo sua imagem e presença.</p></div>
    <div className="member-card narrow"><h2>Assinatura mensal</h2><p className="member-price">{price?`${price} / mês`:'Valor em definição'}</p>
      <p>Biblioteca de vídeos da consultoria, disponível enquanto sua assinatura estiver ativa.</p>
      {!enabled&&<p className="member-message">Estamos preparando as assinaturas. O pagamento ainda não está disponível.</p>}
      <p><a href="/login">Entre na conta</a> ou <a href="/cadastro">cadastre-se</a> antes de continuar.</p>
      <CheckoutForm enabled={enabled} termsUrl={terms}/>
    </div></>;
}
