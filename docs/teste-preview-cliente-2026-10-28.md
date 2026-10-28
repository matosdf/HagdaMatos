# Verificação do Preview com cliente comum — 28/10/2026

Ambiente: https://www.hmpp.com.br, protegido pelo login da Vercel. O usuário concluiu pessoalmente os logins da Vercel e de uma conta comum da HM no navegador integrado. Nenhuma credencial ou cookie foi copiado.

## Resultados observados

| Cenário | Resultado |
| --- | --- |
| Minha conta com sessão comum | Abriu com “Ainda sem assinatura” e 0 de 6 períodos pagos |
| Biblioteca com a mesma sessão sem créditos | Redirecionou para `/planos`, sem exibir biblioteca |
| Acesso direto a `/admin` | Redirecionou para `/conta`, sem abrir administração |
| Atalho Cancelar assinatura | Abriu `/conta#cancelar-assinatura`; informou ausência de assinatura para cancelar |
| Retorno à conta após navegar | Sessão preservada |
| Checkout | Botão desabilitado e aviso de assinaturas em preparação |
| Resumo recorrente de 60 dias | Duas cobranças de R$ 129, total previsto de R$ 258 |
| Antecipação de 60 dias | R$ 258 de uma vez e renovação após terminar o saldo, limitada aos períodos restantes |
| Antecipação de 180 dias e Pix | R$ 774; sem nova cobrança após os seis períodos; Pix sem débito automático |

Os resumos foram conferidos na rodada anterior, sem sessão HM, no mesmo Preview e na mesma data. Também foram observados redirecionamentos ao login para visitante em `/membros`, `/conta` e `/admin`, e abertura das páginas de cadastro, recuperação, termos e privacidade. As minutas permanecem identificadas como não aprovadas.

## Inconsistência encontrada

`/planos` pede “Entre na conta ou cadastre-se” mesmo com a sessão comum ativa. A mensagem é incondicional em `src/app/planos/page.tsx`. A navegação de volta a `/conta` confirmou a sessão; essa mensagem não comprova perda de autenticação. Correção ainda pendente.

## Limites

Esta rodada não valida isolamento de registros entre duas clientes, APIs administrativas com sessão, reprodução por URL privada, conta bloqueada, expiração de sessão, entrega de e-mails, recuperação ou troca efetiva de e-mail. Não foram criados pagamentos, alterados perfis, enviadas mensagens, executadas migrações ou realizados deploys. Integração Asaas e cancelamento externo continuam pendentes.

## Confirmações posteriores do usuário

Em 28/10/2026, o usuário confirmou pessoalmente recuperação de senha e troca de e-mail funcionando. Depois de aplicar is_disabled=true à conta de testes no Supabase, confirmou também o funcionamento do bloqueio. Essas confirmações complementam a rodada observada pelo agente; os cenários negativos e o isolamento entre duas clientes continuam sem evidência específica nesta rodada. O desbloqueio foi orientado, mas não foi confirmado.
