import { redirect } from 'next/navigation';
import { VideoPlayer } from '@/components/forms';
import { SetupNotice } from '@/components/setup-notice';
import { authConfigured } from '@/lib/supabase/server';
import { pageSession } from '@/lib/page-session';
export const dynamic='force-dynamic';
export default async function Membros(){
  if(!authConfigured())return <><h1>Um espaço para <em>você.</em></h1><SetupNotice/><a className="button button-dark" href="/planos">Conhecer a assinatura</a></>;
  const {supabase,user,profile}=await pageSession();
  const {data:allowed,error:accessError}=await supabase.rpc('has_active_subscription',{check_user_id:user.id});
  if(accessError)throw accessError;
  if(!allowed&&!profile.is_owner)redirect('/planos');
  const {data:videos,error}=await supabase.from('exclusive_contents').select('id,title,description').eq('published',true).order('sort_order').order('created_at');
  if(error)throw error;
  return <><div className="member-intro"><p className="member-kicker">Biblioteca exclusiva</p><h1>Sua presença merece <em>continuidade.</em></h1><p>Escolha um conteúdo e siga no seu ritmo.</p></div>
    {!videos?.length?<div className="member-card"><h2>Novos conteúdos em breve.</h2><p>A HM está preparando sua biblioteca de consultoria.</p></div>:
      <div className="member-grid">{videos.map(video=><article className="member-card" key={video.id}><h2>{video.title}</h2><p>{video.description}</p><VideoPlayer id={video.id}/></article>)}</div>}</>;
}
