# Verificação local da proprietária — 24/10/2026

Ambiente: aplicação local iniciada pelo usuário, conectada ao Supabase configurado por ele. Navegador autenticado como proprietária. Nenhuma chave, senha, cookie ou token foi copiado para executar os testes.

## Testes na aplicação em execução

| Verificação | Resultado |
| --- | --- |
| `/admin` com sessão de proprietária | Painel abriu e listou perfis e seções de conteúdo |
| `/conta` com sessão de proprietária | Conta identificada e link administrativo disponível, sem assinatura paga |
| `/membros` com sessão de proprietária | Biblioteca abriu; estado vazio exibido corretamente |
| `/admin`, `/conta`, `/membros` sem cookies | HTTP 307 para `/login` |
| `/api/admin/privacidade` sem sessão | HTTP 401 |
| `/api/videos/{uuid-de-teste}` sem sessão | HTTP 401 |
| POST sem sessão em clientes, conteúdos e upload administrativo | HTTP 401; nenhuma mutação executada |
| POST administrativo com origem estrangeira | HTTP 403 |

As verificações HTTP sem sessão foram executadas fora do navegador, sem copiar cookies da proprietária. Ao terminar, o navegador voltou a `/admin` e a sessão permaneceu aberta.

## Suíte automatizada

`npm test`: 23 testes aprovados. Os testes financeiros usam respostas simuladas; os testes de migrações/RLS usam PostgreSQL em memória. Não representam homologação financeira no Asaas nem execução de cenários destrutivos no projeto Supabase conectado.

## Observações e pendências

- Os dois perfis listados aparecem como “Sem nome”. É necessário preencher os nomes dos perfis antigos; isso não impediu a navegação.
- Falta teste de navegador autenticado como cliente comum, distinto de visitante sem sessão. Não houve troca de identidade nem criação de conta para contornar a confirmação de e-mail.
- Upload, cadastro/edição de conteúdo e bloqueio de cliente não foram executados. Dependem da etapa de backend privilegiado e de dados descartáveis definidos para teste.
- Nenhum pagamento, exclusão, alteração de conta, envio de arquivo, migração externa ou publicação foi realizado.
