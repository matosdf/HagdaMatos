import { createServerClient } from '@supabase/ssr';
import { NextResponse,type NextRequest } from 'next/server';
import {publicSupabaseConfig} from './lib/supabase/public-config';
export async function proxy(request:NextRequest) {
  let response=NextResponse.next({request});
  const {url,key}=publicSupabaseConfig();
  if(!url || !key) return response;
  const supabase=createServerClient(url,key,{cookies:{
    getAll:()=>request.cookies.getAll(),
    setAll(values){
      values.forEach(({name,value})=>request.cookies.set(name,value));
      response=NextResponse.next({request});
      values.forEach(({name,value,options})=>response.cookies.set(name,value,options));
    },
  }});
  await supabase.auth.getUser();
  response.headers.set('Cache-Control','private, no-store');
  return response;
}
export const config={matcher:['/membros/:path*','/conta/:path*','/admin/:path*','/login','/cadastro','/planos','/recuperar-senha']};
