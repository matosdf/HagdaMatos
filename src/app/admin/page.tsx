import { ContentForm,ActionButton,VideoUpload } from '@/components/forms';
import { SetupNotice } from '@/components/setup-notice';
import { authConfigured } from '@/lib/supabase/server';
import { pageSession } from '@/lib/page-session';
export const dynamic='force-dynamic';
export default async function Admin(){
  if(!authConfigured())return <><h1>Administração</h1><SetupNotice/></>;
  const {supabase}=await pageSession(true);
  const [{data:clients,error:clientsError},{data:subscriptions,error:subscriptionsError},{data:contents,error:contentsError}]=await Promise.all([
    supabase.from('member_profiles').select('user_id,full_name,is_disabled,is_owner').order('created_at',{ascending:false}).limit(100),
    supabase.from('subscriptions').select('user_id,status,current_period_end').order('created_at',{ascending:false}).limit(100),
    supabase.from('exclusive_contents').select('id,title,description,storage_path,published').order('created_at',{ascending:false}).limit(100),
  ]);
  if(clientsError||subscriptionsError||contentsError)throw clientsError||subscriptionsError||contentsError;
  return <><p className="member-kicker">Gestão HM</p><h1>Cuidar de cada <em>experiência.</em></h1>
    <div className="member-card"><h2>Clientes recentes</h2><div className="member-table-wrap"><table className="member-table"><thead><tr><th>Nome</th><th>Conta</th><th>Assinatura</th></tr></thead><tbody>
      {clients?.map(client=><tr key={client.user_id}><td>{client.full_name||'Sem nome'}</td><td>{client.is_disabled?'Bloqueada':'Disponível'}{!client.is_owner&&<ActionButton url="/api/admin/clientes" label={client.is_disabled?'Reativar conta':'Bloquear conta'} payload={{userId:client.user_id,disabled:!client.is_disabled}} confirm="Alterar o acesso desta cliente? Essa ação não cancela cobranças no Asaas."/>}</td><td>{subscriptions?.find(s=>s.user_id===client.user_id)?.status||'Sem assinatura'}</td></tr>)}</tbody></table></div></div>
    <div className="member-card"><h2>Enviar um vídeo</h2><p>Arquivos MP4 ou WebM de até 50 MB. Para arquivos maiores, use o painel de armazenamento e confirme os limites do plano contratado.</p><VideoUpload/></div>
    <div className="member-card"><h2>Cadastrar um conteúdo</h2><p>Depois de enviar o vídeo, cadastre seu título e o caminho do arquivo abaixo.</p><ContentForm/></div>
    <div className="member-card"><h2>Conteúdos cadastrados</h2>{contents?.map(content=><details key={content.id}><summary>{content.title} · {content.published?'Publicado':'Rascunho'}</summary><ContentForm content={content}/></details>)}</div>
  </>;
}
