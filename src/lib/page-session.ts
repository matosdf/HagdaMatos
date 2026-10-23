import 'server-only';
import { redirect } from 'next/navigation';
import { requireUser } from './auth';
import { HttpError } from './http';
export async function pageSession(owner=false){
  try{return await requireUser(owner);}catch(error){
    if(error instanceof HttpError && error.status===401)redirect('/login');
    if(error instanceof HttpError && owner && error.status===403)redirect('/conta');
    throw error;
  }
}
