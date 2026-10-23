import { z } from 'zod';
import { requireUser } from '@/lib/auth';
import { adminClient } from '@/lib/supabase/admin';
import { failure,HttpError,json,readJson,requireOrigin } from '@/lib/http';
export async function POST(request:Request){
  try{
    requireOrigin(request);const {user}=await requireUser(true);
    const input=z.object({userId:z.uuid(),disabled:z.boolean()}).parse(await readJson(request));
    if(input.userId===user.id)throw new HttpError(400,'Não é possível bloquear a própria conta por esta tela.');
    const {data,error}=await adminClient().from('member_profiles').update({is_disabled:input.disabled})
      .eq('user_id',input.userId).eq('is_owner',false).select('user_id').maybeSingle();
    if(error)throw error;if(!data)throw new HttpError(404,'Cliente não encontrada.');
    return json({message:input.disabled?'Acesso bloqueado. A cobrança recorrente permanece ativa até cancelamento separado.':'Acesso reativado. A assinatura paga continua sendo necessária.'});
  }catch(error){return failure(error);}
}
