import {requireUser} from '@/lib/auth';
import {adminClient} from '@/lib/supabase/admin';
import {failure,json} from '@/lib/http';
export const dynamic='force-dynamic';
/** Prévia protegida. Não remove contas, pagamentos ou registros externos. */
export async function GET(){
  try{
    await requireUser(true);
    const {data,error}=await adminClient().rpc('retention_candidates');
    if(error)throw error;
    return json({mode:'preview-only',deletionEnabled:false,candidates:data});
  }catch(error){return failure(error);}
}
