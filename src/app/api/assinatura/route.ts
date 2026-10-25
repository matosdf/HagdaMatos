import { requireAccountUser } from '@/lib/auth';
import { adminClient } from '@/lib/supabase/admin';
import { paymentGateway } from '@/lib/payments';
import { failure,HttpError,json,requireOrigin } from '@/lib/http';
import { cancellationState, requestCancellation } from '@/lib/cancellation';
export async function POST(request:Request) {
  try {
    requireOrigin(request);
    const {user,supabase}=await requireAccountUser();
    const {data:subscription,error}=await supabase.from('subscriptions').select('id,provider_subscription_id,provider_canceled,cancellation_requested_at')
      .eq('user_id',user.id).eq('provider_canceled',false).maybeSingle();
    if(error) throw error;
    const state=cancellationState(subscription);
    if(state==='none')return json({message:'Não há renovação ativa para cancelar.'});
    if(state==='pending')return json({message:'O cancelamento já foi solicitado. Aguardando confirmação do provedor.'});
    // Desabilitar novas vendas não pode impedir o cancelamento de uma assinatura.
    if (process.env.ASAAS_INTEGRATION_READY!=='true') throw new HttpError(503,'Cancelamento automático ainda não configurado.');
    await requestCancellation(subscription,id=>paymentGateway().cancelSubscription(id),async id=>{
      const {error:updateError}=await adminClient().from('subscriptions')
        .update({cancellation_requested_at:new Date().toISOString()}).eq('id',id).eq('user_id',user.id);
      if(updateError) throw updateError;
    });
    return json({message:'Cancelamento solicitado. Os períodos já pagos permanecem disponíveis até o fim da vigência. A recorrência será interrompida após a confirmação do provedor.'});
  } catch(error) {return failure(error);}
}
