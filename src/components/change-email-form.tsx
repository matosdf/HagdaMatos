'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

export function ChangeEmailForm({ currentEmail, pendingEmail }: {
  currentEmail: string; pendingEmail?: string;
}) {
  const router = useRouter();
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState(false);
  return <div className="member-card narrow">
    <h2>Alterar meu e-mail</h2>
    <p>E-mail atual: <strong>{currentEmail}</strong></p>
    {pendingEmail && <p role="status">A troca para <strong>{pendingEmail}</strong> ainda está pendente. Clique no link de confirmação recebido em <strong>{currentEmail}</strong> e também no recebido em <strong>{pendingEmail}</strong>. Confirmar apenas um deles não conclui a troca.</p>}
    <p>Você precisa ter acesso ao e-mail atual e ao novo. A troca só será concluída depois da confirmação nos dois endereços.</p>
    <ol>
      <li>Abra o e-mail enviado ao seu endereço atual e clique em “Confirmar alteração de e-mail”.</li>
      <li>Abra a mensagem enviada ao novo endereço e clique no botão de confirmação também.</li>
      <li>Depois das duas confirmações, use o novo e-mail para entrar. Sua senha permanece a mesma.</li>
    </ol>
    <p>Você pode confirmar em qualquer ordem. Abra os links neste mesmo navegador e confira o spam se não encontrar as mensagens.</p>
    <form className="member-form" onSubmit={async event => {
      event.preventDefault();
      const form = event.currentTarget;
      const fields = new FormData(form);
      const email = String(fields.get('email') || '').trim().toLowerCase();
      const confirmEmail = String(fields.get('confirmEmail') || '').trim().toLowerCase();
      setMessage('');
      if (email !== confirmEmail) { setMessage('Os endereços de e-mail devem ser iguais.'); return; }
      if (email === currentEmail.trim().toLowerCase()) { setMessage('Informe um endereço diferente do seu e-mail atual.'); return; }
      setBusy(true);
      try {
        const response = await fetch('/api/conta/email', {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email, confirmEmail }),
        });
        const data = await response.json();
        if (!response.ok) throw new Error(data.error || 'Não foi possível solicitar a alteração.');
        setMessage(data.message); setSent(true); form.reset(); router.refresh();
      } catch (error) {
        setMessage(error instanceof Error ? error.message : 'Não foi possível solicitar a alteração.');
      } finally { setBusy(false); }
    }}>
      <label>Novo e-mail<input name="email" type="email" autoComplete="email" required maxLength={200} disabled={busy || sent}/></label>
      <label>Confirme o novo e-mail<input name="confirmEmail" type="email" autoComplete="off" required maxLength={200} disabled={busy || sent}/></label>
      <button className="button button-dark" disabled={busy || sent}>{busy ? 'Enviando…' : sent ? 'Solicitação enviada' : 'Solicitar alteração de e-mail'}</button>
      {message && <p className="member-message" role="status">{message}</p>}
      {sent && <button className="button button-dark" type="button" onClick={() => { setSent(false); setMessage(''); }}>Informar outro endereço</button>}
    </form>
  </div>;
}
