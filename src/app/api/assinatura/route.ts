import { requireUser } from '@/lib/auth';
import { adminClient } from '@/lib/supabase/admin';
import { paymentGateway } from '@/lib/payments';
import { failure,HttpError,json,requireOrigin } from '@/lib/http';
export async function POST(request:Request) {
  try {
    requireOrigin(request);
    const {user}=await requireUser();
    if (process.env.BILLING_ENABLED!=='true'||process.env.ASAAS_INTEGRATION_READY!=='true') throw new HttpError(503,'Cobranças ainda não configuradas.');
    const admin=adminClient();
    const {data:subscription,error}=await admin.from('subscriptions').select('id,provider_subscription_id')
      .eq('user_id',user.id).eq('provider_canceled',false).maybeSingle();
    if(error) throw error;
    if(!subscription) throw new HttpError(404,'Assinatura não encontrada.');
    await paymentGateway().cancelSubscription(subscription.provider_subscription_id);
    const {error:updateError}=await admin.from('subscriptions')
      .update({cancellation_requested_at:new Date().toISOString()}).eq('id',subscription.id);
    if(updateError) throw updateError;
    return json({message:'Cancelamento solicitado. Os períodos já pagos permanecem disponíveis até o fim da vigência. A recorrência será interrompida após a confirmação do provedor.'});
  } catch(error) {return failure(error);}
}
