import { NextResponse } from 'next/server';
import { serverClient } from '@/lib/supabase/server';
import { confirmationDestination } from '@/lib/auth-confirm';
export async function GET(request:Request){
  const url=new URL(request.url);
  const destination=await confirmationDestination(url.searchParams,async code=>{
    const {error}=await (await serverClient()).auth.exchangeCodeForSession(code);
    return !error;
  });
  return NextResponse.redirect(new URL(destination,process.env.NEXT_PUBLIC_APP_URL || url.origin));
}
