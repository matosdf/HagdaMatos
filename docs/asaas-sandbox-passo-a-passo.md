# Asaas Sandbox — preparação e conexão

## Já confirmado pelo usuário em 28/10/2026

- Conta separada do Sandbox acessível.
- `ASAAS_API_KEY` e `ASAAS_API_URL=https://api-sandbox.asaas.com/v3` salvas somente no Preview da branch `refatoracao_area_exclusiva`.
- Redeploy realizado após inserir as variáveis.
- `BILLING_ENABLED`, `ASAAS_INTEGRATION_READY`, `ASAAS_ALLOW_PRODUCTION` e `LEGAL_DOCUMENTS_APPROVED` mantidas em `false`.

Isso confirma a preparação declarada, não a validade da chave nem uma homologação financeira.

## Próximo ensaio: conexão sem cobrança

1. Publicar o código do diagnóstico no Preview após autorização específica para push da branch. Não alterar main, domínio antigo ou ambiente Production.
2. Confirmar que o novo deployment está Ready e serve a alteração em `www.hmpp.com.br`.
3. Entrar com a conta da proprietária, não com cliente comum. Abrir `/admin`.
4. No cartão **Integração Asaas Sandbox**, clicar em **Verificar conexão Sandbox**.
5. Resultado esperado: “Conexão com o Asaas Sandbox confirmada. Nenhuma cobrança foi criada.”
6. Se a chave for recusada, conferir ambiente, valor completo da chave e permissão no painel, sem copiar valores para chat ou issues. Para indisponibilidade/limite da API, tentar mais tarde.
7. Cliente comum e visitante não podem executar o diagnóstico; o endpoint exige sessão administrativa e origem correta.

O teste faz somente uma leitura autenticada de até um cadastro, sem devolver dados de clientes ao navegador ou gravá-los no banco/logs. Não cria cliente, cobrança, assinatura, webhook nem crédito. Não solicita chave privilegiada do Supabase. O botão fica ausente em Production e a operação também recusa esse ambiente no backend.

## Depois da conexão

- Concluir a persistência do contrato e o agendamento de 30 dias exatos; criação de cobranças permanece bloqueada.
- Homologar data efetiva e precisão de datas do cartão/Pix antes de liberar créditos. As datas civis do fornecedor não comprovam um instante com hora/minuto.
- Preparar token próprio do webhook (32–255 caracteres, sem espaços e diferente da API key), inserido diretamente no ambiente protegido.
- Definir recebimento externo autenticado compatível com Deployment Protection. Não desabilitar a proteção do Preview inteiro para receber webhook. O endpoint ainda permanece desabilitado nesta etapa.
- Testar antecipação, cancelamento, estorno, repetição/concorrência, reconciliação e teto do produto no Sandbox.
- Revisar/aprovar documentos antes de habilitar contratação; não alterar a flag de aprovação para contornar a pendência.

Referências: [Sandbox](https://docs.asaas.com/docs/sandbox), [listar clientes](https://docs.asaas.com/reference/listar-clientes), [webhook autenticado](https://docs.asaas.com/docs/receive-asaas-events-at-your-webhook-endpoint).
