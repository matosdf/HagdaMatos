import { AuthForm } from '@/components/forms';
import { pageSession } from '@/lib/page-session';
export const dynamic='force-dynamic';
export default async function Senha(){await pageSession();return <><h1>Uma nova <em>senha.</em></h1><p>Use pelo menos 12 caracteres.</p><div className="member-card narrow"><AuthForm mode="senha"/></div></>;}
