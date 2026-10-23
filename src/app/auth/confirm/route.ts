import { NextResponse } from 'next/server';
import { serverClient } from '@/lib/supabase/server';
export async function GET(request:Request){
  const url=new URL(request.url),code=url.searchParams.get('code');
  if(code){
    const {error}=await (await serverClient()).auth.exchangeCodeForSession(code);
    if(!error){const next=url.searchParams.get('next')==='/conta/nova-senha'?'/conta/nova-senha':'/conta';
      return NextResponse.redirect(new URL(next,process.env.NEXT_PUBLIC_APP_URL || url.origin));}
  }
  return NextResponse.redirect(new URL('/login?confirmacao=erro',process.env.NEXT_PUBLIC_APP_URL || url.origin));
}
