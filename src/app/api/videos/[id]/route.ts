import { requireUser } from '@/lib/auth';
import { adminClient } from '@/lib/supabase/admin';
import { failure,HttpError,json } from '@/lib/http';
import { z } from 'zod';
export const dynamic='force-dynamic';
export async function GET(_request:Request,context:{params:Promise<{id:string}>}) {
  try {
    const {supabase}=await requireUser();
    const {id}=await context.params; z.uuid().parse(id);
    // Consulta com token da cliente: RLS revalida assinatura e bloqueio administrativo.
    const {data:content,error}=await supabase.from('exclusive_contents').select('storage_path')
      .eq('id',id).eq('published',true).maybeSingle();
    if(error || !content) throw new HttpError(403,'Conteúdo indisponível para sua assinatura.');
    const path=content.storage_path;
    if(path.startsWith('/') || path.includes('..') || path.includes('://')) throw new HttpError(400,'Vídeo inválido.');
    const admin=adminClient();
    const {data:bucket,error:bucketError}=await admin.storage.getBucket('member-videos');
    if(bucketError||!bucket||bucket.public)throw new HttpError(503,'Armazenamento privado indisponível.');
    const {data,error:signError}=await admin.storage.from('member-videos').createSignedUrl(path,60);
    if(signError || !data) throw new HttpError(503,'Vídeo temporariamente indisponível.');
    return json({url:data.signedUrl,expiresIn:60});
  } catch(error) {return failure(error);}
}
