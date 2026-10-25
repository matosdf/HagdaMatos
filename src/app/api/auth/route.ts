import { z } from 'zod';
import { serverClient } from '@/lib/supabase/server';
import { failure,HttpError,json,readJson,requireOrigin } from '@/lib/http';
import { signupFailure } from '@/lib/signup-errors';
const schema=z.discriminatedUnion('mode',[
  z.object({mode:z.literal('login'),email:z.email().max(200),password:z.string().min(1).max(128)}),
  z.object({mode:z.literal('cadastro'),email:z.email().max(200),password:z.string().min(12).max(128),name:z.string().trim().min(3).max(150)}),
  z.object({mode:z.literal('recuperar'),email:z.email().max(200)}),
  z.object({mode:z.literal('senha'),password:z.string().min(12).max(128)}),
]);
export async function POST(request:Request) {
  try{
    requireOrigin(request);const input=schema.parse(await readJson(request));const supabase=await serverClient();
    if(input.mode==='login'){
      const {error}=await supabase.auth.signInWithPassword({email:input.email,password:input.password});
      if(error)throw new HttpError(400,'Não foi possível entrar. Confira e-mail, senha e confirmação da conta.');
      return json({redirect:'/conta'});
    }
    if(input.mode==='cadastro'){
      if(process.env.REGISTRATION_ENABLED!=='true')throw new HttpError(503,'Cadastros ainda não disponíveis.');
      const {error}=await supabase.auth.signUp({email:input.email,password:input.password,
        options:{data:{full_name:input.name},emailRedirectTo:`${process.env.NEXT_PUBLIC_APP_URL}/auth/confirm`}});
      if(error){
        const safe=signupFailure(error);
        console.warn('[Auth signup]',safe.diagnostic);
        throw new HttpError(safe.status,safe.message);
      }
      return json({message:'Confira seu e-mail para confirmar a conta. Se já possui cadastro, entre ou recupere sua senha.'});
    }
    if(input.mode==='recuperar'){
      await supabase.auth.resetPasswordForEmail(input.email,{redirectTo:`${process.env.NEXT_PUBLIC_APP_URL}/auth/confirm?next=/conta/nova-senha`});
      return json({message:'Se houver uma conta com esse e-mail, você receberá as instruções de recuperação.'});
    }
    const {data:{user}}=await supabase.auth.getUser();
    if(!user)throw new HttpError(401,'Abra o link enviado ao seu e-mail.');
    const {error}=await supabase.auth.updateUser({password:input.password});
    if(error)throw new HttpError(400,'Não foi possível atualizar a senha. Solicite um novo link.');
    return json({redirect:'/conta'});
  }catch(error){return failure(error);}
}
