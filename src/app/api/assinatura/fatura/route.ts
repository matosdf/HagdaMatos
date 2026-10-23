import { requireUser } from '@/lib/auth';
import { paymentGateway } from '@/lib/payments';
import { failure,HttpError,json,requireOrigin } from '@/lib/http';
export async function POST(request:Request){
  try{
    requireOrigin(request);const {supabase,user}=await requireUser();
    const {data:subscription,error}=await supabase.from('subscriptions').select('provider_subscription_id')
      .eq('user_id',user.id).eq('provider_canceled',false).maybeSingle();
    if(error)throw error;if(!subscription)throw new HttpError(404,'Assinatura não encontrada.');
    const url=await paymentGateway().getPaymentUrl(subscription.provider_subscription_id);
    return json({redirect:url});
  }catch(error){return failure(error);}
}
