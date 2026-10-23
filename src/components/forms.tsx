'use client';
import { useState } from 'react';
import { createBrowserClient } from '@supabase/ssr';
async function post(url:string,payload:unknown) {
  const response=await fetch(url,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(payload)});
  const data=await response.json();
  if(!response.ok) throw new Error(data.error || 'Não foi possível concluir.');
  return data;
}
export function AuthForm({mode}:{mode:'login'|'cadastro'|'recuperar'|'senha'}) {
  const [message,setMessage]=useState(''),[busy,setBusy]=useState(false);
  return <form className="member-form" onSubmit={async e=>{
    e.preventDefault();setBusy(true);setMessage('');const fields=Object.fromEntries(new FormData(e.currentTarget));
    try {const data=await post('/api/auth',{mode,...fields});if(data.redirect) location.assign(data.redirect);else setMessage(data.message);}
    catch(error){setMessage((error as Error).message);}finally{setBusy(false);}
  }}>
    {mode==='cadastro' && <label>Nome completo<input name="name" autoComplete="name" required minLength={3} maxLength={150}/></label>}
    {mode!=='senha' && <label>E-mail<input name="email" type="email" autoComplete="email" required maxLength={200}/></label>}
    {mode!=='recuperar' && <label>Senha<input name="password" type="password" autoComplete={mode==='login'?'current-password':'new-password'} required minLength={mode==='login'?1:12} maxLength={128}/></label>}
    <button className="button button-dark" disabled={busy}>{busy?'Aguarde…':({login:'Entrar',cadastro:'Criar minha conta',recuperar:'Enviar link de recuperação',senha:'Salvar nova senha'})[mode]}</button>
    {message && <p className="member-message" role="status">{message}</p>}
  </form>;
}
export function CheckoutForm({enabled,termsUrl}:{enabled:boolean;termsUrl:string}) {
  const [message,setMessage]=useState(''),[busy,setBusy]=useState(false);
  return <form className="member-form" onSubmit={async e=>{
    e.preventDefault();setBusy(true);setMessage('');const data=Object.fromEntries(new FormData(e.currentTarget));
    try {const result=await post('/api/checkout',{...data,cpfCnpj:String(data.cpfCnpj).replace(/\D/g,''),phone:String(data.phone).replace(/\D/g,''),acceptedTerms:data.acceptedTerms==='on'});
      location.assign(result.paymentUrl);
    }catch(error){setMessage((error as Error).message);}finally{setBusy(false);}
  }}>
    <label>Nome completo<input name="name" autoComplete="name" required minLength={3} maxLength={150}/></label>
    <label>CPF ou CNPJ<input name="cpfCnpj" inputMode="numeric" required maxLength={18}/></label>
    <label>Celular com DDD<input name="phone" type="tel" autoComplete="tel" required maxLength={20}/></label>
    <label>Forma de pagamento<select name="billingType"><option value="CREDIT_CARD">Cartão de crédito — recorrência mensal</option><option value="PIX">Pix — pagamento a cada cobrança</option><option value="UNDEFINED">Escolher na fatura do Asaas</option></select></label>
    {termsUrl && <label className="check"><input name="acceptedTerms" type="checkbox" required/><span>Li e aceito os <a href={termsUrl} target="_blank" rel="noopener noreferrer">termos da assinatura</a>.</span></label>}
    <button className="button button-dark" disabled={!enabled || busy}>{busy?'Preparando sua assinatura…':enabled?'Continuar para pagamento':'Assinaturas em preparação'}</button>
    <p className="member-muted">Os dados do cartão são preenchidos no ambiente do Asaas. O Pix gera cobranças mensais e exige pagamento; não equivale a débito automático no cartão.</p>
    {message && <p className="member-message" role="status">{message}</p>}
  </form>;
}
export function ActionButton({url,label,confirm,payload={}}:{url:string;label:string;confirm?:string;payload?:Record<string,unknown>}) {
  const [message,setMessage]=useState(''),[busy,setBusy]=useState(false);
  return <div><button className="button button-dark" disabled={busy} onClick={async()=>{
    if(confirm && !window.confirm(confirm))return;
    setBusy(true);try{const data=await post(url,payload);if(data.redirect)location.assign(data.redirect);else setMessage(data.message);}
    catch(error){setMessage((error as Error).message);}finally{setBusy(false);}
  }}>{busy?'Aguarde…':label}</button>{message && <p role="status">{message}</p>}</div>;
}
export function VideoPlayer({id}:{id:string}) {
  const [url,setUrl]=useState(''),[message,setMessage]=useState(''),[busy,setBusy]=useState(false);
  return <div><button className="button button-dark" disabled={busy} onClick={async()=>{
    setBusy(true);setMessage('');try{const res=await fetch(`/api/videos/${id}`,{cache:'no-store'});const data=await res.json();
      if(!res.ok)throw new Error(data.error);setUrl(data.url);
    }catch(error){setMessage((error as Error).message);}finally{setBusy(false);}
  }}>{busy?'Preparando vídeo…':'Assistir ao vídeo'}</button>
    {url && <video controls controlsList="nodownload" preload="metadata" src={url} onError={()=>{setUrl('');setMessage('O link expirou ou o vídeo está indisponível. Clique em assistir para tentar novamente.');}}>Seu navegador não suporta vídeos.</video>}
    {message && <p role="status">{message}</p>}</div>;
}
export function ContentForm({content}:{content?:{id:string;title:string;description:string;storage_path:string;published:boolean}}) {
  const [message,setMessage]=useState(''),[busy,setBusy]=useState(false);
  return <form className="member-form" onSubmit={async e=>{
    e.preventDefault();setBusy(true);const data=Object.fromEntries(new FormData(e.currentTarget));
    try{await post('/api/admin/conteudos',{...data,...(content?{id:content.id}:{}),published:data.published==='on'});setMessage('Conteúdo salvo. Atualize a página para ver a biblioteca.');}
    catch(error){setMessage((error as Error).message);}finally{setBusy(false);}
  }}><label>Título<input name="title" defaultValue={content?.title} required maxLength={150}/></label><label>Descrição<textarea name="description" defaultValue={content?.description} maxLength={2000}/></label>
    <label>Caminho do vídeo no armazenamento privado<input name="storagePath" defaultValue={content?.storage_path} placeholder="consultoria/aula-01.mp4" required maxLength={300}/></label>
    <label className="check"><input type="checkbox" name="published" defaultChecked={content?.published}/><span>Publicar para assinantes</span></label>
    <button className="button button-dark" disabled={busy}>{busy?'Salvando…':content?'Salvar alterações':'Cadastrar conteúdo'}</button>{message && <p role="status">{message}</p>}</form>;
}

export function VideoUpload(){
  const [message,setMessage]=useState(''),[busy,setBusy]=useState(false);
  return <form className="member-form" onSubmit={async e=>{
    e.preventDefault();const file=new FormData(e.currentTarget).get('file');if(!(file instanceof File))return;
    setBusy(true);setMessage('Enviando vídeo. Mantenha esta página aberta.');
    try{
      const signed=await post('/api/admin/videos/upload',{filename:file.name,size:file.size,type:file.type});
      const supabase=createBrowserClient(process.env.NEXT_PUBLIC_SUPABASE_URL!,process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!);
      const {error}=await supabase.storage.from('member-videos').uploadToSignedUrl(signed.path,signed.token,file,{contentType:file.type});
      if(error)throw new Error('Não foi possível enviar o arquivo. Confira o limite de tamanho do armazenamento.');
      setMessage(`Vídeo enviado. Copie este caminho para o cadastro de conteúdo: ${signed.path}`);
    }catch(error){setMessage((error as Error).message);}finally{setBusy(false);}
  }}><label>Arquivo do vídeo<input type="file" name="file" accept="video/mp4,video/webm" required/></label>
    <button className="button button-dark" disabled={busy}>{busy?'Enviando…':'Enviar vídeo privado'}</button>
    {message&&<p className="member-message" role="status">{message}</p>}</form>;
}
