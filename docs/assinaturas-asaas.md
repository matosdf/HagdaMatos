# Área exclusiva: estado atual e próximos passos

## Configuração comercial

A decisão vigente está em [decisoes-2026-10-24.md](decisoes-2026-10-24.md): R$ 129,00 por 30 dias, até seis períodos por produto, biblioteca comum e acesso pago preservado após cancelamento. A fonte comercial no código é `src/lib/product.ts`.

- [Passo a passo do Supabase sem chaves no chat](supabase-passo-a-passo.md)
- [Backlog detalhado no GitHub e local](backlog.md)
- [Minuta de termos, oito artigos](minutas/termos-da-assinatura.md)
- [Minuta de privacidade, oito seções](minutas/politica-de-privacidade.md)

## Implementado localmente

- Next.js, autenticação e painel de conta/administração.
- Produto de R$129 e seletor de um a seis períodos com total transparente.
- Motor de créditos em `003_periodos_30_dias.sql`: cada pagamento único acrescenta 30×N dias a partir da data efetiva, somando ao saldo existente. O mesmo pagamento confirmado/recebido não duplica créditos.
- Limite de seis períodos aplicado também entre assinaturas/readmissões do mesmo produto. Valores excedentes ou incompatíveis ficam sinalizados para revisão financeira.
- Cancelamento confirmado encerra recorrência, não o direito sobre créditos pagos. RLS verifica o saldo válido mesmo em assinatura cancelada.
- Estornos retiram os créditos correspondentes e recalculam o saldo; sem carência e sem liberação por redirect.
- Prévia administrativa de retenção em `/api/admin/privacidade`, sem exclusão. Calcula 90 dias após o fim do acesso pago ou cancelamento posterior; contas administrativas, com retenção legal ou readmissão não são selecionadas indevidamente.
- Biblioteca privada, upload até 50MB, edição/publicação/despublicação e bloqueio administrativo.
- Minutas em `/termos` e `/privacidade`, identificadas como não aprovadas.

Os vídeos MOV locais antigos estão em `storage-local/videos-originais/`, fora do diretório público e do Git.

## Aplicar o banco em testes, quando autorizado

1. `002_membros_assinaturas.sql`: schema inicial de membros.
2. `003_periodos_30_dias.sql`: regras aprovadas nesta iteração. Interrompe se houver pagamentos pagos antigos que precisem de reconciliação.
3. Confirmar a conta da proprietária e executar manualmente `database/onboarding/proprietaria.sql`.
4. `001_diagnostico.sql` é independente e deve ser aplicado somente se a campanha também for testada.

Nenhuma migração externa, criação de conta, cobrança, upload de vídeo real ou deploy foi executado nesta iteração.

## Asaas continua no backlog

### Decisão de pagamento e recorrência — 25/10/2026

- Somente `PIX` e `CREDIT_CARD`. A escolha aberta `UNDEFINED` foi retirada do formulário, validação e contrato do gateway. A URL de cobrança hospedada pelo Asaas é um recurso técnico, não uma terceira forma de pagamento nem autorização para boleto.
- **Recorrente:** escolher 60 dias significa duas cobranças de R$129 separadas por 30 dias. Cada pagamento libera 30 dias; reservar duração não libera acesso ainda não pago. A recorrência deve parar na duração contratada, considerando períodos já adquiridos e o teto de seis por produto.
- **Antecipado:** escolher 60 dias significa R$258 em uma única cobrança; as próximas renovações são de R$129/30 dias somente depois de esgotado o saldo pago. Antecipar os seis períodos não deixa renovações restantes. Antecipação não multiplica o valor nem o intervalo da renovação.
- O resumo da interface distingue as duas modalidades, valor inicial, valor por renovação e quantidade restante. O Pix convencional exige ação a cada pagamento; o cartão deverá permitir renovação automática homologada.
- Encontrado no adaptador antigo: `MONTHLY`, que não representa 30 dias exatos. A criação dessa assinatura foi removida e bloqueada antes de requisições externas. A capacidade `recurringScheduleReady()` permanece false independentemente das flags de ambiente, impedindo o checkout antes de gravar tentativa ou criar cobrança.
- Antes de habilitar: persistir modalidade, duração contratada, unidades de cada pagamento e consentimento de renovação; separar cobrança inicial única de assinatura; programar a próxima cobrança usando o saldo efetivamente confirmado pelo webhook; limitar quantidade restante no provedor e conciliar cancelamentos, antecipações posteriores, estornos e concorrência. Nunca reaproveitar `requested_units=N` para atribuir N créditos a uma cobrança recorrente de R$129.
- Os testes verificam o contrato comercial e ausência de requisições no adaptador bloqueado. Isso não equivale à homologação do agendador real. A integração permanece para a próxima iteração Asaas.

O adaptador legado fica preservado para evolução, mas ainda precisa de data real de pagamento (`paidAt`), compras antecipadas, prevenção de cobranças após o sexto período, vínculo do cartão e conciliação. Seu cálculo anterior por mês de calendário não pode alimentar o motor novo. Todos os endpoints financeiros devem continuar desativados até homologação.

Manter:

```env
BILLING_ENABLED=false
ASAAS_INTEGRATION_READY=false
ASAAS_ALLOW_PRODUCTION=false
LEGAL_DOCUMENTS_APPROVED=false
```

A variável antiga `SUBSCRIPTION_MONTHLY_PRICE` é apenas referência no exemplo; o valor aprovado está em `src/lib/product.ts`, sem depender de segredo ou de configuração fornecida pelo navegador.

## Recuperar contratação interrompida

### Cancelamento direto

O menu e o rodapé da área exclusiva têm atalho para `/conta#cancelar-assinatura`. A seção aparece antes da troca de e-mail, com botão explícito, sem justificativa ou telas de retenção. O pedido é enviado em um clique; a interface distingue ausência de assinatura, solicitação pendente e confirmação do provedor. Mostra o fim do acesso pago e contato por e-mail em caso de indisponibilidade. Desligar `BILLING_ENABLED` para parar vendas não bloqueia o cancelamento de assinaturas existentes. A chamada externa continua dependendo da homologação Asaas; até lá o ambiente de testes informa que o cancelamento automático está em preparação.

Minha conta e o endpoint de cancelamento usam sessão autenticada para consulta própria, inclusive quando a cliente foi bloqueada para conteúdos. Biblioteca, administração, checkout e troca de e-mail continuam exigindo conta não bloqueada. Na homologação financeira: testar cancelamento com saldo, sem saldo, após antecipação, após bloqueio administrativo, repetição/concorrência, falha do provedor e webhook de confirmação. A interrupção efetiva e o prazo de resposta precisam ser comprovados no Sandbox; a interface não é prova de cancelamento externo.

A trava `checkout_attempts` evita criação concorrente. Uma resposta ambígua fica `needs_review`; não repetir POST financeiro às cegas. Na futura homologação, conferir no Asaas a assinatura pelo UUID em `externalReference`, completar vínculos e reenviar o evento autenticado. Nunca marcar acesso pago manualmente na produção para contornar falta de pagamento.

## O que ainda não está ativo

- Cobranças/antecipações reais ou de Sandbox, reativação e reconciliação do Asaas.
- Exclusão definitiva e agendamento de retenção: apenas prévia, até confirmar exceções legais, backups e procedimentos externos.
- Comunicação própria por fila/outbox e canais a definir.
- Conteúdo real da biblioteca e confirmação dos limites de armazenamento/streaming.
- Aprovação jurídica/editorial das minutas e preenchimento da identificação da responsável.

## Referências

- [Supabase: chaves públicas e secretas](https://supabase.com/docs/guides/getting-started/api-keys)
- [Asaas: assinatura](https://docs.asaas.com/reference/criar-nova-assinatura)
- [Asaas: webhooks](https://docs.asaas.com/docs/receive-asaas-events-at-your-webhook-endpoint)
- [CDC](https://www.planalto.gov.br/ccivil_03/leis/l8078compilado.htm)
- [LGPD](https://www.planalto.gov.br/ccivil_03/_ato2015-2018/2018/lei/l13709compilado.htm)
