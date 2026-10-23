import { z } from 'zod';
import { requireUser } from '@/lib/auth';
import { adminClient } from '@/lib/supabase/admin';
import { failure,json,readJson,requireOrigin } from '@/lib/http';
export async function POST(request:Request){
  try{
    requireOrigin(request);await requireUser(true);
    const data=z.object({id:z.uuid().optional(),title:z.string().trim().min(3).max(150),description:z.string().max(2000),
      storagePath:z.string().min(1).max(300).regex(/^[a-zA-Z0-9_/-]+\.(mp4|webm)$/),published:z.boolean()}).parse(await readJson(request));
    const admin=adminClient();
    // Confirmar existência antes de publicar; evita títulos apontando para arquivos inexistentes.
    const {error:fileError}=await admin.storage.from('member-videos').createSignedUrl(data.storagePath,1);
    if(fileError)throw fileError;
    const values={title:data.title,description:data.description,storage_path:data.storagePath,published:data.published};
    const {error}=await (data.id?admin.from('exclusive_contents').update(values).eq('id',data.id):admin.from('exclusive_contents').insert(values));
    if(error)throw error;return json({saved:true});
  }catch(error){return failure(error);}
}
