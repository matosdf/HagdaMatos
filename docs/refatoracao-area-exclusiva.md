# Refatoração e área exclusiva

> Registro do planejamento inicial. A implementação e as pendências atuais estão em [assinaturas-asaas.md](assinaturas-asaas.md).

## Escopo acordado em 23/10/2026

- Preservar praticamente todo o conteúdo e a identidade visual do site institucional.
- Arquivar o Guia da Mãe Intencional em `campanhas_realizadas`.
- Organizar o diagnóstico em `campanhas_vigentes`, considerando seu lançamento futuro. A classificação da pasta não significa que a campanha já foi lançada.
- Concentrar o desenvolvimento em `refatoracao_area_exclusiva`, mantendo `main` estável.
- Aproveitar seletivamente as ideias do portal antigo para criar uma área paga de clientes com vídeos e assinatura mensal.

## Histórico preservado

As branches antigas foram substituídas por tags locais e remotas:

| Branch antiga | Referência de arquivo |
| --- | --- |
| codex_approach | arquivo/codex_approach-2026-10-23 |
| nova_cara | arquivo/nova_cara-2026-10-23 |
| implementacao_vercel | arquivo/implementacao_vercel-2026-10-23 |

Consultar um arquivo sem trocar de branch: `git show arquivo/implementacao_vercel-2026-10-23:docs/portal-vercel.md`.

## Aproveitamento do portal

A versão arquivada contém autenticação Supabase, sessões em cookies HttpOnly, perfis de cliente e proprietária, cadastro, convites, recuperação de senha e controle administrativo de acesso. Essas ideias serão aproveitadas após revisão do código e das regras de autorização.

O portal antigo não implementa assinatura recorrente nem autorização de reprodução de vídeos. Seu controle manual `is_active` não substitui a confirmação financeira. Não fazer merge integral: a branch também contém páginas públicas e estilos anteriores ao posicionamento atual.

Fotos, PDFs e referências pessoais podem ser incorporados conforme sua utilidade para a consultoria. Lembretes de aniversário e integrações com redes sociais ficam fora da primeira entrega, salvo decisão posterior.

## Arquitetura proposta, ainda não implementada

1. Manter o site público e acrescentar uma entrada para a área da cliente quando ela estiver pronta.
2. Autenticar clientes e proprietária, com separação de permissões no backend e no banco.
3. Usar checkout do provedor de pagamento para cadastrar o cartão e contratar a assinatura mensal. O site não recebe nem armazena os dados do cartão.
4. Receber eventos autenticados do provedor sobre pagamentos, falhas, cancelamentos e estornos. Processar cada evento uma única vez, suportar reenvios e reconciliar o estado quando eventos chegarem fora de ordem.
5. Registrar o período de acesso pago confirmado. Verificar a autorização no backend a cada solicitação de conteúdo protegido, inclusive durante uma sessão já aberta.
6. Manter o login disponível para a cliente atualizar o pagamento e consultar a assinatura. Restringir os vídeos quando não houver acesso válido, conforme as regras de negócio aprovadas.
7. Entregar vídeos por armazenamento ou streaming privado, com autorização e links de curta duração. Não colocar os arquivos pagos no diretório público nem usar apenas uma página escondida como proteção.
8. Executar reconciliação periódica de assinaturas como recuperação de eventos perdidos. A cobrança mensal é responsabilidade do provedor, e a verificação de acesso não deve depender somente de uma consulta mensal.

Entidades previstas: perfis, clientes, planos, assinaturas, pagamentos, eventos processados, vídeos e permissões de conteúdo. O bloqueio administrativo de uma conta deve prevalecer sobre uma assinatura paga.

## Decisões antes da integração financeira

- Provedor de cobrança e conta que receberá os pagamentos.
- Preço, planos, eventual período gratuito e condições de cancelamento.
- Quando começa o acesso e se existe tolerância após falha de renovação.
- Tratamento de cancelamento ao fim do período pago, estorno e contestação.
- Biblioteca comum a todas as assinantes ou vídeos específicos por cliente/plano.
- Serviço de armazenamento/streaming e volume esperado de vídeos.

## Sequência sugerida

1. Organização de campanhas e Git: executada nesta etapa; arquivos de compatibilidade preservam links antigos.
2. Refatoração estrutural: separar estilos e módulos sem mudar a apresentação; documentar execução e implantação.
3. Portal: autenticação, recuperação de conta, painel da cliente e administração com autorização por perfil.
4. Assinaturas: integração em ambiente de testes, eventos, estados de pagamento e regras de acesso.
5. Vídeos privados: biblioteca, reprodução autorizada e controle de acesso por cliente/plano.
6. Validação integrada: pagamento aprovado/recusado, renovação, cancelamento, expiração, eventos repetidos e acesso direto aos vídeos.

Nenhuma cobrança, migração de banco ou implantação da área paga foi feita nesta etapa.
