import {randomUUID} from 'node:crypto';
import {z} from 'zod';
import {requireUser} from '@/lib/auth';
import {adminClient} from '@/lib/supabase/admin';
import {failure,HttpError,json,readJson,requireOrigin} from '@/lib/http';
export async function POST(request:Request){
  try{
    requireOrigin(request);await requireUser(true);
    const input=z.object({filename:z.string().max(250),size:z.number().int().positive().max(50*1024*1024),
      type:z.enum(['video/mp4','video/webm'])}).parse(await readJson(request));
    const extension=input.type==='video/mp4'?'mp4':'webm';
    if(!input.filename.toLowerCase().endsWith(`.${extension}`))throw new HttpError(400,'Tipo do vídeo não corresponde à extensão.');
    const path=`consultoria/${randomUUID()}.${extension}`;
    const admin=adminClient();
    const {data:bucket,error:bucketError}=await admin.storage.getBucket('member-videos');
    if(bucketError||!bucket||bucket.public)throw new HttpError(503,'Armazenamento privado ainda não configurado.');
    const {data,error}=await admin.storage.from('member-videos').createSignedUploadUrl(path,{upsert:false});
    if(error||!data)throw new HttpError(503,'Não foi possível preparar o envio.');
    return json({path,token:data.token});
  }catch(error){return failure(error);}
}
