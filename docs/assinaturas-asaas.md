# Área exclusiva: configuração e pendências

## Estado desta entrega

Implementada localmente a migração para Next.js, preservando as páginas institucionais em `public/`, as campanhas e a identidade visual. O backend possui adaptador Asaas, checkout autenticado, webhooks, conta, recuperação de senha, biblioteca protegida e administração inicial.

Não foram criados usuários, cobranças, assinaturas, buckets ou tabelas em serviços externos. As migrações foram verificadas em PostgreSQL local em memória. Os testes do Asaas usam respostas simuladas; o ciclo real ainda depende da conta Sandbox. Nenhum push ou deploy faz parte desta entrega.

Os três arquivos MOV locais que estavam em `Fotos/` foram preservados em `storage-local/videos-originais/`, fora da pasta pública e do Git. Nenhum vídeo foi publicado nem enviado a um serviço externo.

## Informações e decisões necessárias

| Item | O que informar/configurar | Estado atual |
| --- | --- | --- |
| Plano | Valor mensal definitivo e nome comercial | Sem preço padrão; R$ 97 do contexto não foi tratado como decisão |
| Asaas Sandbox | Chave API e conta de testes | Adaptador pronto, sem credenciais |
| Recorrência no cartão | Habilitação necessária na conta e vínculo do cartão preenchido na fatura à assinatura | Precisa ser homologado no Sandbox; não foi testado contra o Asaas real |
| Webhook | Token com pelo menos 24 caracteres | Endpoint pronto, fechado sem token |
| Supabase | URL, chave pública e chave service role | Clientes preparados; banco e Auth dependem do projeto |
| E-mail da proprietária | Conta que administrará clientes e vídeos | Papel atribuído manualmente após cadastro |
| Domínio | URL final e URL de preview que será usada no Sandbox | Exemplo local em `.env.example` |
| Vídeos | Arquivos, títulos, descrições e ordem | Bucket privado proposto: `member-videos` |
| Biblioteca | Conteúdo comum ou personalizado por cliente/plano | Primeira versão usa biblioteca comum |
| Cancelamento | Bloqueio imediato ou acesso até o fim do período pago | Provisoriamente bloqueia após confirmação do cancelamento |
| Vigência | Renovação pelo vencimento ou pela data do pagamento | Provisoriamente usa vencimento + um mês de calendário |
| Carência | Existência e duração após vencimento | Sem carência; RLS bloqueia no fim da vigência |
| Estornos | Política para estorno parcial e contestação | Qualquer estorno informado ou chargeback suspende o pagamento correspondente |
| Pagamento | Cartão, Pix ou escolha na fatura | Os três preparados; Pix não equivale a débito automático no cartão |
| Termos e privacidade | Textos aprovados e URL HTTPS dos termos | Sem termos não se inicia contratação |
| Comunicação | Textos e regras de cobrança/WhatsApp/e-mail | Depende da conta Asaas e do SMTP Supabase |
| Retenção de dados | Prazo e procedimento para dados pessoais | Precisa de definição operacional |

**Segredos não devem ser enviados no chat nem inseridos em documentos versionados.** Preencha-os em `.env.local` (ignorado pelo Git) ou nas variáveis da Vercel. Para suporte, informe os nomes das variáveis preenchidas e os erros sem valores secretos.

## Supabase

1. Criar ou selecionar o projeto.
2. Configurar `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY` e `SUPABASE_SERVICE_ROLE_KEY` no ambiente local/preview.
3. Aplicar `database/migrations/001_diagnostico.sql` se a tabela ainda não existe. Não reaplicar sobre políticas existentes sem revisar.
4. Aplicar **uma vez** `database/migrations/002_membros_assinaturas.sql`. Não é um script para reaplicação manual repetida.
5. Conferir que o bucket `member-videos` está privado. Se já existia, a migração não altera sua configuração: confirmar que não está público e que não há políticas públicas prévias.
6. Habilitar confirmação de e-mail, configurar SMTP, política de senha e limites de autenticação para o lançamento.
7. Configurar Site URL e URLs de redirecionamento permitidas:
   - `http://localhost:3000/auth/confirm`
   - `http://localhost:3000/auth/confirm?next=/conta/nova-senha`
   - Equivalentes HTTPS no domínio/preview escolhido.
8. Manter os links de confirmação gerados pelo Supabase nos templates de e-mail. O fluxo PKCE exige abrir o link no navegador em que a solicitação foi iniciada.
9. Habilitar `REGISTRATION_ENABLED=true`, cadastrar a proprietária e confirmar seu e-mail.
10. Promover apenas o UUID correto no SQL Editor:

```sql
update public.member_profiles
set is_owner = true
where user_id = 'UUID_DA_PROPRIETARIA';
```

Nenhuma usuária pode se promover pelo formulário. Os perfis criados pelo trigger começam sem privilégios.

## Asaas Sandbox

A URL oficial atual usada no código é `https://api-sandbox.asaas.com/v3`, substituindo a URL antiga do documento de contexto.

1. Criar conta Sandbox e gerar chave API.
2. Configurar `ASAAS_API_KEY`, `ASAAS_WEBHOOK_SECRET`, preço e termos.
3. Configurar `NEXT_PUBLIC_APP_URL` com a origem exata usada no navegador. Mutações rejeitam origens diferentes ou ausentes.
4. Disponibilizar uma implantação de preview HTTPS para receber webhooks reais; o Asaas não alcança `localhost`.
5. Cadastrar no Asaas a URL `https://DOMINIO-DE-PREVIEW/api/webhooks/asaas` e o mesmo token definido em `ASAAS_WEBHOOK_SECRET`.
6. Habilitar eventos de cobranças (confirmação, recebimento, vencimento, atualização, exclusão, restauração, estorno e chargeback) e de assinatura. Preferir envio sequencial. Conferir os nomes disponíveis com a documentação atual.
7. Confirmar as migrações antes de enviar eventos.
8. Definir `BILLING_ENABLED=true` depois da configuração. Manter `ASAAS_ALLOW_PRODUCTION=false` no Sandbox.

O adaptador cria cliente e assinatura, consulta a primeira cobrança para obter `invoiceUrl` e direciona ao Asaas. Nenhum dado de cartão passa pelo site. O valor vem do servidor. O aceite dos termos é registrado ao iniciar a contratação.

Na homologação, conferir explicitamente se o cartão informado na fatura fica associado à assinatura para os vencimentos seguintes e qual fluxo hospedado será usado para troca do cartão. A tokenização/recorrência pode exigir habilitação da conta. Não considerar o débito automático homologado apenas por haver uma assinatura criada ou uma primeira fatura paga.

## Regras de acesso

- Apenas pagamentos confirmados/recebidos, obtidos pelo receptor de webhook autenticado, geram vigência.
- Retorno do checkout e criação da assinatura não liberam conteúdo.
- Cada cobrança tem registro único; confirmação e recebimento da mesma cobrança não duplicam meses.
- A vigência usa o vencimento até a mesma data no mês seguinte, com ajuste para fevereiro e meses curtos. Início do dia em São Paulo: UTC−3 na configuração atual.
- O acesso considera os intervalos dos pagamentos válidos, inclusive períodos futuros, e não deve preencher lacunas sem pagamento.
- Avisos antigos são reconsultados no Asaas antes da gravação. Exclusões autenticadas são terminais para a assinatura.
- Evento, pagamento e vigência são gravados em uma transação. Falhas retornam erro e permitem reenvio; IDs já processados são reconhecidos.
- Recursos não relacionados à aplicação são ignorados; eventos de contratação ainda em gravação retornam erro para reenvio.
- Exige-se assinatura ativa, intervalo pago válido e conta não bloqueada. O banco confere o prazo a cada consulta, sem depender de job mensal.
- Estorno antigo não apaga outra cobrança válida; cancelamento da assinatura bloqueia todos os seus pagamentos.
- Bloquear conta não cancela cobranças. O painel informa essa distinção.

## Vídeos

1. Em `/admin`, enviar MP4/WebM de até 50 MB diretamente ao bucket privado; copiar o caminho retornado. Arquivos maiores podem ser enviados pelo painel Supabase, conforme os limites do plano.
2. Em `/admin`, cadastrar título, descrição e caminho; não usar URL pública.
3. Marcar publicação para disponibilizar a assinantes.

A API consulta o conteúdo com a sessão da cliente e sua política RLS; depois emite URL assinada de 60 segundos. Não há cache público de dados de acesso.

URLs assinadas são credenciais temporárias: outra pessoa que obtenha o link poderá usá-lo durante a validade. Isso não é DRM nem impede gravação de tela. Para vídeos longos ou transmissão adaptativa, definir serviço de streaming antes da importação completa. `nodownload` é apenas uma conveniência visual.

O painel cadastra e edita conteúdos, permite publicar/despublicar, envia vídeos de até 50 MB e consulta/bloqueia clientes. Paginação além dos 100 registros recentes, upload retomável de arquivos grandes e vídeos personalizados são evoluções futuras.

## Contratação interrompida

`checkout_attempts` usa uma chave única por cliente para impedir criações concorrentes. Timeout ou erro após possível criação no Asaas mantém a tentativa em `needs_review`; uma nova tentativa não cria outra cobrança.

Procedimento manual:

1. Localizar o UUID da tentativa no Supabase.
2. No Asaas, procurar assinatura cujo `externalReference` corresponde a esse UUID; conferir cliente, valor e cobranças.
3. Se criada, completar o vínculo em `subscriptions`, incluindo `checkout_attempt_id`, inicialmente `incomplete`. Reenviar eventos pelo Asaas; não marcar `active` manualmente.
4. Se foi comprovado que nenhuma assinatura foi criada, remover apenas a tentativa dessa cliente para permitir nova contratação.
5. Não remover tentativas em lote nem repetir POSTs financeiros às cegas.

O cancelamento confirmado remove apenas a trava associada àquela contratação, permitindo nova assinatura. Não há reconciliação financeira periódica automática nesta versão: acompanhar falhas e reenvios no painel Asaas. A expiração de acesso funciona sem job. A reconciliação automática depende de ambiente e política operacional definidos.

## Validar antes da produção

- Cadastro, confirmação, login, recuperação e saída.
- Cartão e Pix, sem acesso antes do pagamento.
- Confirmação, recebimento, renovação, atraso, estorno, chargeback e cancelamento.
- Eventos repetidos, fora de ordem e falha temporária do banco.
- Clique duplo no checkout e resposta ambígua do provedor.
- Isolamento entre clientes, expiração e bloqueio de novas URLs de vídeo.
- Conta bloqueada com assinatura paga.
- Fatura pendente e nova contratação após cancelamento confirmado.

Após validar o Sandbox e confirmar as decisões pendentes: preparar conta real, mudar para `https://api.asaas.com/v3`, configurar chaves de produção e habilitar `ASAAS_ALLOW_PRODUCTION=true`. Isso depende de decisão explícita de lançamento.

## Referências

- [Asaas: assinatura](https://docs.asaas.com/reference/criar-nova-assinatura)
- [Asaas: webhooks](https://docs.asaas.com/docs/receive-asaas-events-at-your-webhook-endpoint)
- [Asaas: cartão](https://docs.asaas.com/docs/cobrancas-via-cartao-de-credito)
- [Asaas: eventos](https://docs.asaas.com/docs/webhook-para-cobrancas)
- [Supabase SSR](https://supabase.com/docs/guides/auth/server-side/creating-a-client)
- [Next.js 16](https://nextjs.org/docs/app/guides/upgrading/version-16)
