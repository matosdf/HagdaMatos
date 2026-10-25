# HM Presença & Performance

Site institucional preservado e área exclusiva preparada em **Next.js App Router + Supabase + Asaas**. Desenvolvimento em `refatoracao_area_exclusiva`; `main` permanece estável.

## Executar localmente

Requer Node.js 22 ou superior.

```powershell
npm install
npm run dev
```

Abra `http://localhost:3000`. Sem credenciais, as páginas públicas funcionam e a área exclusiva mostra um aviso de preparação. Copie `.env.example` para `.env.local` e preencha os campos quando tiver os serviços disponíveis. Não versione esse arquivo.

```powershell
npm run typecheck
npm test
npm run build
npm start
```

Os scripts usam Node diretamente para funcionar em caminhos Windows que contêm `&`. Se o npm reportar erro de certificado, use os certificados do Windows com `NODE_USE_SYSTEM_CA=1`; não desative a verificação TLS.

## Organização

- `public/`: apenas arquivos públicos, com os endereços institucionais preservados.
- `public/campanhas_realizadas/`: Guia da Mãe Intencional.
- `public/campanhas_vigentes/`: diagnóstico, com lançamento futuro.
- `public/assets/`: CSS, JavaScript e configuração compartilhada do diagnóstico.
- `src/app/`: páginas Next.js e Route Handlers.
- `src/components/`: componentes da área exclusiva.
- `src/lib/payments/`: contrato agnóstico e adaptador Asaas.
- `src/lib/supabase/`: clientes de sessão e backend privilegiado.
- `src/lib/legacy/`: integração anterior do diagnóstico adaptada ao Next.js.
- `src/proxy.ts`: renovação de sessão (nome atual do middleware no Next.js 16).
- `database/migrations/`: SQL versionado, ainda não aplicado a serviços externos.
- `tests/`: testes de domínio, adaptador e PostgreSQL/RLS em memória.
- `storage-local/videos-originais/`: vídeos locais anteriores, preservados fora da pasta pública e ignorados pelo Git.
- `docs/`: decisões, configuração e pendências.

`/` serve a página institucional existente; `/diagnostico` serve a campanha sem mudar o endereço público. Os arquivos antigos de campanhas redirecionam para as novas pastas. CSS e JavaScript do guia foram extraídos; os tokens visuais foram separados. O diagnóstico compartilha as perguntas entre navegador e backend e recalcula os resultados no servidor.

## Regras aprovadas em 24/10/2026

R$ 129,00 por 30 dias, até seis períodos/180 dias. Pagamentos antecipados somam ao saldo; cancelamento preserva acesso pago. Retenção prevista por 90 dias após fim do acesso pago ou cancelamento posterior.

Consulte o [passo a passo Supabase](docs/supabase-passo-a-passo.md), [backlog](docs/backlog.md), [termos](docs/minutas/termos-da-assinatura.md) e [privacidade](docs/minutas/politica-de-privacidade.md). Asaas permanece bloqueado até a próxima iteração; exclusão de dados está apenas em prévia.

## Área exclusiva

- `/login`, `/cadastro`, `/recuperar-senha`: autenticação e confirmação por e-mail.
- `/conta`: assinatura, cobrança pendente, cancelamento e saída.
- `/planos`: contratação pelo checkout hospedado do Asaas.
- `/membros`: biblioteca protegida no servidor e por RLS.
- `/admin`: consulta de clientes, bloqueio de contas e cadastro de vídeos.
- `/api/webhooks/asaas`: eventos autenticados, deduplicados e processados em transação.

Não há acesso pago fictício nem chave secreta no navegador. Cadastro, cobrança e uso do Asaas de produção estão desativados no exemplo. Vídeos pagos não devem ser colocados em `public/`.

Consulte [configuração e pendências](docs/assinaturas-asaas.md) antes de habilitar serviços. As [decisões vigentes](docs/decisoes-2026-10-24.md) registram as regras comerciais e prevalecem sobre os exemplos do planejamento anterior.

## Histórico

As branches antigas foram preservadas nas tags `arquivo/codex_approach-2026-10-23`, `arquivo/nova_cara-2026-10-23` e `arquivo/implementacao_vercel-2026-10-23`.

```powershell
git show arquivo/implementacao_vercel-2026-10-23:docs/portal-vercel.md
```

Não executar push, exclusões remotas ou alterações de configuração no GitHub sem autorização específica para a ação remota.
