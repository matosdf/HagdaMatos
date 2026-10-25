import { z } from 'zod';
import { adminClient } from '@/lib/supabase/admin';
import { paymentGateway } from '@/lib/payments';
import { AsaasApiError } from '@/lib/payments/asaas.provider';
import { failure, HttpError, json, readJson, secretMatches } from '@/lib/http';
export const runtime = 'nodejs';
const payloadSchema = z.object({ id:z.string().min(1).max(200), event:z.string().max(100),
  payment:z.object({id:z.string().min(1).max(150),subscription:z.string().nullish(),customer:z.string().optional()}).optional(),
  subscription:z.object({id:z.string().min(1).max(150),customer:z.string().optional(),externalReference:z.string().nullish()}).optional(),
});
export async function POST(request:Request) {
  try {
    if(process.env.ASAAS_INTEGRATION_READY!=='true')throw new HttpError(503,'Integração Asaas aguardando homologação das regras de 30 dias.');
    if (!process.env.ASAAS_WEBHOOK_SECRET) throw new HttpError(503,'Webhook ainda não configurado.');
    if (!secretMatches(request.headers.get('asaas-access-token'),process.env.ASAAS_WEBHOOK_SECRET))
      throw new HttpError(401,'Webhook não autorizado.');
    const payload=payloadSchema.parse(await readJson(request,131072));
    const admin=adminClient();
    const {data:duplicate,error:duplicateError}=await admin.from('billing_events').select('event_id')
      .eq('provider','asaas').eq('event_id',payload.id).maybeSingle();
    if (duplicateError) throw duplicateError;
    if (duplicate) return json({received:true,duplicate:true});
    const gateway=paymentGateway();
    let normalized;
    if (payload.event.startsWith('PAYMENT_') && payload.payment) {
      if(!payload.payment.subscription)return json({received:true,ignored:true});
      // Reconsultar impede que um aviso antigo de confirmação reverta um estorno atual.
      try{normalized={kind:'payment',...await gateway.getPayment(payload.payment.id)};}
      catch(error){
        if(!(error instanceof AsaasApiError)||error.status!==404||payload.event!=='PAYMENT_DELETED')throw error;
        if(!payload.payment.customer)throw new HttpError(400,'Cliente da cobrança ausente.');
        normalized={kind:'payment',subscriptionId:payload.payment.subscription,customerId:payload.payment.customer,
          paymentId:payload.payment.id,state:'revoked',amountCents:0,periodStart:'1970-01-01T00:00:00Z',
          periodEnd:'1970-01-01T00:00:00Z',observedAt:new Date().toISOString()};
      }
    } else if (payload.event.startsWith('SUBSCRIPTION_') && payload.subscription) {
      // Um evento de exclusão autenticado é terminal; o recurso pode já retornar 404 na API.
      if (payload.event==='SUBSCRIPTION_DELETED') {
        if (!payload.subscription.customer) throw new HttpError(400,'Cliente da assinatura ausente.');
        normalized={kind:'subscription',subscriptionId:payload.subscription.id,
          customerId:payload.subscription.customer,canceled:true};
      } else {
        const subscription=await gateway.getSubscription(payload.subscription.id);
        normalized={kind:'subscription',subscriptionId:subscription.id,
          customerId:subscription.customerId,canceled:subscription.canceled};
      }
    } else return json({received:true,ignored:true});
    const {data:registered,error:lookupError}=await admin.from('subscriptions').select('id')
      .eq('provider','asaas').eq('provider_subscription_id',normalized.subscriptionId).maybeSingle();
    if(lookupError)throw lookupError;
    if(!registered){
      let reference=payload.subscription?.externalReference;
      if(payload.event!=='SUBSCRIPTION_DELETED'){
        try{reference=(await gateway.getSubscription(normalized.subscriptionId)).reference;}
        catch(error){
          if(error instanceof AsaasApiError&&error.status===404)return json({received:true,ignored:true});
          throw error;
        }
      }
      if(!reference || !z.uuid().safeParse(reference).success)return json({received:true,ignored:true});
      const {data:attempt,error:attemptError}=await admin.from('checkout_attempts').select('id').eq('id',reference).maybeSingle();
      if(attemptError)throw attemptError;
      if(!attempt)return json({received:true,ignored:true});
      throw new HttpError(503,'Contratação ainda em registro. Reenvie o evento.');
    }
    const {error}=await admin.rpc('apply_billing_event',{p:{provider:'asaas',eventId:payload.id,
      eventType:payload.event,...normalized}});
    // Só confirmar depois da transação. Falhas retornam 503 para permitir reenvio.
    if (error) throw error;
    return json({received:true});
  } catch(error) { return failure(error); }
}
