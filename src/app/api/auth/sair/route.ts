import { serverClient } from '@/lib/supabase/server';
import { failure,json,requireOrigin } from '@/lib/http';
export async function POST(request:Request){
  try{requireOrigin(request);const {error}=await (await serverClient()).auth.signOut();if(error)throw error;return json({redirect:'/login'});}
  catch(error){return failure(error);}
}
