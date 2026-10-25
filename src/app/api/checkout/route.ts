import { z } from 'zod';
import { requireUser } from '@/lib/auth';
import { adminClient } from '@/lib/supabase/admin';
import { paymentGateway } from '@/lib/payments';
import { failure, HttpError, json, readJson, requireOrigin } from '@/lib/http';
import { PRODUCT } from '@/lib/product';
export const runtime = 'nodejs';
const inputSchema = z.object({
  name: z.string().trim().min(3).max(150), cpfCnpj: z.string().regex(/^(\d{11}|\d{14})$/),
  phone: z.string().regex(/^\d{10,13}$/), billingType: z.enum(['PIX','CREDIT_CARD','UNDEFINED']),
  acceptedTerms: z.literal(true),
  periods: z.coerce.number().int().min(1).max(6).default(1),
});
export async function POST(request: Request) {
  try {
    requireOrigin(request);
    if (process.env.BILLING_ENABLED !== 'true' || process.env.ASAAS_INTEGRATION_READY !== 'true' || process.env.LEGAL_DOCUMENTS_APPROVED !== 'true') throw new HttpError(503, 'Assinaturas ainda não estão disponíveis.');
    if(!process.env.ASAAS_API_KEY || !process.env.ASAAS_WEBHOOK_SECRET || !(process.env.SUPABASE_SECRET_KEY||process.env.SUPABASE_SERVICE_ROLE_KEY))
      throw new HttpError(503,'Integração de pagamentos ainda incompleta.');
    const termsUrl=`${PRODUCT.siteUrl}/termos`;
    const { user,supabase } = await requireUser();
    if (!user.email) throw new HttpError(400, 'E-mail necessário.');
    const input = inputSchema.parse(await readJson(request));
    const amountCents = PRODUCT.priceCents;
    const {data:summary,error:summaryError}=await supabase.rpc('member_access_summary');
    if(summaryError)throw summaryError;
    if(input.periods>Number(summary?.remainingPeriods ?? 0))throw new HttpError(409,'Esta compra ultrapassa os seis períodos do produto.');
    // Antecipação financeira só será habilitada quando houver homologação do Asaas.
    if(input.periods!==1)throw new HttpError(503,'A antecipação de períodos está em preparação.');
    const admin = adminClient();
    const { data: current, error: currentError } = await admin.from('subscriptions').select('*')
      .eq('user_id',user.id).eq('provider_canceled',false).maybeSingle();
    if (currentError) throw currentError;
    if (current) return json({ paymentUrl: await paymentGateway().getPaymentUrl(current.provider_subscription_id), existing: true });
    // A PK por usuária é uma trava durável entre instâncias serverless.
    // Nunca repetir automaticamente uma criação após resposta ambígua do provedor.
    const { data: attempt, error: attemptError } = await admin.from('checkout_attempts')
      .insert({ user_id:user.id,accepted_terms_url:termsUrl,terms_version:PRODUCT.termsVersion,requested_units:input.periods }).select('id').single();
    if (attemptError || !attempt) throw new HttpError(409, 'Uma contratação já foi iniciada. Contate a HM para verificar seu estado.');
    try {
      const { data: previous, error: previousError } = await admin.from('subscriptions')
        .select('provider_customer_id').eq('user_id',user.id).eq('provider','asaas')
        .order('created_at',{ascending:false}).limit(1).maybeSingle();
      if (previousError) throw previousError;
      const checkout = await paymentGateway().createSubscription({ ...input, email:user.email,
        userId:user.id, reference:attempt.id, amountCents, customerId:previous?.provider_customer_id });
      const { error } = await admin.from('subscriptions').insert({
        user_id:user.id,provider:'asaas',provider_customer_id:checkout.providerCustomerId,checkout_attempt_id:attempt.id,product_code:PRODUCT.code,
        provider_subscription_id:checkout.providerSubscriptionId,amount_cents:amountCents,
        payment_method:input.billingType,payment_url:checkout.paymentUrl,
      });
      if (error) throw error;
      const { error: finishError } = await admin.from('checkout_attempts').update({state:'ready'}).eq('user_id',user.id);
      if (finishError) throw finishError;
      return json({paymentUrl:checkout.paymentUrl});
    } catch (error) {
      await admin.from('checkout_attempts').update({state:'needs_review'}).eq('user_id',user.id);
      throw error;
    }
  } catch (error) { return failure(error); }
}
