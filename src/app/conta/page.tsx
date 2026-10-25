import { ActionButton } from '@/components/forms';
import { ChangeEmailForm } from '@/components/change-email-form';
import { SetupNotice } from '@/components/setup-notice';
import { authConfigured } from '@/lib/supabase/server';
import { pageSession } from '@/lib/page-session';
export const dynamic='force-dynamic';
export default async function Conta(){
  if(!authConfigured())return <><h1>Minha <em>conta.</em></h1><SetupNotice/></>;
  const {supabase,user,profile}=await pageSession();
  const {data:subscription,error}=await supabase.from('subscriptions').select('*').eq('user_id',user.id).order('created_at',{ascending:false}).limit(1).maybeSingle();
  if(error)throw error;
  const {data:summary,error:accessError}=await supabase.rpc('member_access_summary');
  if(accessError)throw accessError;
  const active=summary?.hasAccess===true;
  const labels:Record<string,string>={active:'Ativa',incomplete:'Aguardando pagamento',past_due:'Pagamento pendente',unpaid:'Acesso suspenso',canceled:'Cancelada'};
  return <><p className="member-kicker">Meu espaço HM</p><h1>Olá, <em>{profile.full_name || 'bem-vinda'}.</em></h1><p>{user.email}</p>
    <div className="member-card"><h2>Sua assinatura</h2><span className="member-status">{subscription?(active?(subscription.provider_canceled?'Cancelada — acesso pago preservado':'Acesso disponível'):subscription.status==='active'?'Período de acesso encerrado':labels[subscription.status] || 'Em análise'):'Ainda sem assinatura'}</span>
      {summary?.paidUntil&&<p>Vigência confirmada até {new Date(summary.paidUntil).toLocaleString('pt-BR',{timeZone:'America/Sao_Paulo'})}.</p>}
      <p>{summary?.usedPeriods??0} de 6 períodos pagos. Cada período corresponde a 30 dias.</p>
      <p>{active?'Seu acesso aos conteúdos está disponível.':'Você pode continuar usando sua conta para acompanhar ou regularizar a assinatura.'}</p>
      <div className="member-actions"><a className="button button-dark" href={active?'/membros':'/planos'}>{active?'Abrir biblioteca':'Conhecer assinatura'}</a>
        {profile.is_owner&&<a href="/admin">Administrar área exclusiva</a>}</div>
      {subscription&&!subscription.provider_canceled&&<div className="member-actions"><ActionButton url="/api/assinatura/fatura" label="Abrir cobrança pendente"/><ActionButton url="/api/assinatura" label="Solicitar cancelamento" confirm="Deseja cancelar novas cobranças? Os períodos já pagos continuarão disponíveis até o fim da vigência."/></div>}
    </div>
    <ChangeEmailForm currentEmail={user.email || ''} pendingEmail={user.new_email}/>
    <ActionButton url="/api/auth/sair" label="Sair da conta"/></>;
}
