import { AuthForm } from '@/components/forms';
import { SetupNotice } from '@/components/setup-notice';
import { authConfigured } from '@/lib/supabase/server';
export const dynamic='force-dynamic';
export default function Recuperar(){return <><h1>Vamos recuperar seu <em>acesso.</em></h1><div className="member-card narrow">{authConfigured()?<AuthForm mode="recuperar"/>:<SetupNotice/>}</div></>;}
