import { CheckoutForm } from '@/components/forms';
import { authConfigured } from '@/lib/supabase/server';
import { PRODUCT } from '@/lib/product';
import { recurringScheduleReady } from '@/lib/payments/policy';
export const dynamic='force-dynamic';
export default function Planos(){
  const price=(PRODUCT.priceCents/100).toLocaleString('pt-BR',{style:'currency',currency:'BRL'});
  const terms='/termos';
  const enabled=recurringScheduleReady()&&authConfigured()&&process.env.BILLING_ENABLED==='true'&&process.env.ASAAS_INTEGRATION_READY==='true'&&process.env.LEGAL_DOCUMENTS_APPROVED==='true'&&!!process.env.ASAAS_API_KEY&&!!process.env.ASAAS_WEBHOOK_SECRET&&!!(process.env.SUPABASE_SECRET_KEY||process.env.SUPABASE_SERVICE_ROLE_KEY);
  return <><div className="member-intro"><p className="member-kicker">Sua presença, em movimento</p><h1>Aprendizado que acompanha sua <em>evolução.</em></h1><p>Um espaço para acessar os conteúdos em vídeo da HM e seguir desenvolvendo sua imagem e presença.</p></div>
    <div className="member-card narrow"><h2>Acesso por períodos de 30 dias</h2><p className="member-price">{price} / 30 dias</p>
      <p>Escolha pagar R$ 129 a cada 30 dias ou antecipar períodos pagando o total de uma vez. Biblioteca comum às assinantes, até seis períodos por produto. Cancelar interrompe novas cobranças e preserva o tempo já pago.</p>
      {!enabled&&<p className="member-message">Estamos preparando as assinaturas. O pagamento ainda não está disponível.</p>}
      <p><a href="/login">Entre na conta</a> ou <a href="/cadastro">cadastre-se</a> antes de continuar.</p>
      <CheckoutForm enabled={enabled} termsUrl={terms}/>
    </div></>;
}
