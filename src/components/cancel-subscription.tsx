'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { cancellationState, type CancellationSummary } from '@/lib/cancellation';

export function CancelSubscription({ subscription, paidUntil, enabled }: {
  subscription: CancellationSummary | null; paidUntil?: string; enabled: boolean;
}) {
  const router=useRouter();
  const [busy,setBusy]=useState(false),[sent,setSent]=useState(false),[error,setError]=useState('');
  const state=cancellationState(subscription);
  const pending=state==='pending'||sent;
  return <section id="cancelar-assinatura" className="member-card cancellation-card" aria-labelledby="cancel-title">
    <h2 id="cancel-title">Cancelar assinatura</h2>
    {state==='none'?<p>Você não tem assinatura para cancelar.</p>:state==='canceled'?<div role="status">
      <p><strong>As renovações desta assinatura já foram canceladas.</strong></p>
      <p>Os períodos já pagos continuam disponíveis até o fim da vigência.</p>
    </div>:<>
      <p>Para interromper as próximas cobranças, use o botão abaixo. Não é necessário informar motivo nem falar com o atendimento.</p>
      <p>O cancelamento mantém seu acesso pelo tempo já pago{paidUntil?`, até ${new Date(paidUntil).toLocaleString('pt-BR',{timeZone:'America/Sao_Paulo'})}`:''}.</p>
      {pending?<div role="status"><p><strong>Cancelamento solicitado.</strong> Aguardando a confirmação do provedor. Não é necessário solicitar novamente.</p></div>:<>
        <button className="button button-dark" type="button" disabled={busy||!enabled} onClick={async()=>{
          setBusy(true);setError('');
          try {
            const response=await fetch('/api/assinatura',{method:'POST',headers:{'Content-Type':'application/json'},body:'{}'});
            const data=await response.json();
            if(!response.ok)throw new Error(data.error||'Não foi possível concluir o cancelamento agora.');
            setSent(true);router.refresh();
          }catch(reason){setError(reason instanceof Error?reason.message:'Não foi possível concluir o cancelamento agora.');}
          finally{setBusy(false);}
        }}>{busy?'Cancelando…':'Cancelar assinatura e próximas cobranças'}</button>
        {!enabled&&<p>O cancelamento automático ainda está em preparação neste ambiente de testes.</p>}
      </>}
      {error&&<p role="alert">{error} O cancelamento não foi confirmado. Tente novamente ou use o contato abaixo.</p>}
      {(error||!enabled||pending)&&<p>Se precisar de ajuda, <a className="legal-link" href="mailto:matoshagda@gmail.com?subject=Cancelamento%20de%20assinatura%20HM">solicite o cancelamento por e-mail</a>.</p>}
    </>}
  </section>;
}
