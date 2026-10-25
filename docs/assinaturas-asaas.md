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
