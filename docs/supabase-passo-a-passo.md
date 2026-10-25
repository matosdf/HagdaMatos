# Supabase, em etapas e sem chaves no chat

## 1. O que esconder e o que é público

A URL do projeto e a chave **publishable** são configurações públicas. A chave **secret** (ou `service_role` legada) é privilegiada e fica exclusivamente no backend. Nunca a coloque em `NEXT_PUBLIC_*`, no chat, em prints, nas issues ou no Git.

Variáveis de ambiente não são um cofre contra programas do mesmo usuário. Variáveis Windows persistidas no perfil podem ser lidas por processos desse usuário. `.gitignore` evita versionamento acidental, mas não impede leitura. Um terminal separado reduz a herança de variáveis; não cria isolamento de segurança. Para uma barreira real, use outro usuário/ambiente isolado ou um servidor com segredos ao qual o agente só tenha acesso HTTP de teste. Também é possível configurar restrições efetivas de leitura e herança de ambiente no Codex; isso deve ser feito por você fora deste projeto, sem conceder exceções que removam a proteção.

Nesta iteração não li chaves nem conectei ao seu projeto. Os testes financeiros e RLS usam PostgreSQL em memória, sem credenciais reais.

## 2. Primeiro encontro: projeto de testes

Se já houver projeto, primeiro aguarde o banco ficar disponível e execute `database/diagnostics/001_inventario_somente_leitura.sql` no SQL Editor. Ele lista somente estrutura, sem registros. Confirme também se há dados reais e se algum site já usa o projeto. A indicação `PRODUCTION` na interface exige conferir o uso real; ela não comprova que existem clientes ativos. Não execute as migrações 002/003 sobre o banco existente antes de comparar o inventário e decidir o ambiente de testes.

1. Acesse sua conta Supabase pelo navegador pessoal.
2. Crie um projeto de testes separado, sem dados reais de clientes. Não reutilize produção para a primeira migração.
3. Anote o nome do projeto e confirme que é um ambiente de testes. Nenhuma chave precisa ser compartilhada comigo.
4. Abra as configurações de API e localize a URL e a chave publishable. Não use a chave secret no lugar da publishable.
5. Mantenha `BILLING_ENABLED=false`, `ASAAS_INTEGRATION_READY=false` e `ASAAS_ALLOW_PRODUCTION=false`.

Podemos parar aqui e conferir o próximo passo juntos. Não vou operar seu painel nem executar SQL externo sem autorização específica.

## 3. Preparar o banco, manualmente

1. Leia os scripts locais antes de executá-los.
2. No SQL Editor do **projeto de testes**, execute uma vez `database/migrations/002_membros_assinaturas.sql`.
3. Execute `database/migrations/003_periodos_30_dias.sql`. Ela exige que não existam pagamentos pagos antigos a reconciliar. Se houver dados, pare; não apague registros para contornar a proteção.
4. A migração `001_diagnostico.sql` é separada: só aplique se também quiser testar a campanha e se a tabela/políticas ainda não existirem.
5. Confira RLS nas tabelas e que o bucket `member-videos` está privado, sem políticas de leitura pública.
6. Para correção de erro, compartilhe apenas a mensagem sanitizada. Não envie dumps de dados pessoais nem conteúdo de variáveis.

## 4. Autenticação

1. Em Authentication, habilite e-mail/senha e confirmação do e-mail.
2. Configure o Site URL de teste e permita os retornos `/auth/confirm` e `/auth/confirm?next=/conta/nova-senha` para esse endereço.
3. No desenvolvimento local, use `http://localhost:3000`; em produção, `https://www.hmpp.com.br`.
4. Configure o envio de e-mail do Supabase e seus limites. E-mails de confirmação e recuperação são de autenticação; não fazem parte da futura régua comercial de comunicação.
5. Mantenha os links de confirmação gerados pelo Supabase nos templates. Abra o link no mesmo navegador usado no cadastro para o fluxo PKCE.

## 5. Rodar localmente sem salvar segredos

### Troca de e-mail em Minha conta

- O formulário em `/conta` solicita a alteração pelo usuário autenticado, sem chave privilegiada. Contas bloqueadas não podem usar a operação.
- Em Authentication, nas configurações do provedor Email, mantenha **Secure email change** habilitado para confirmar a troca nos endereços atual e novo. O código não altera essa configuração externa.
- O template **Change email address** deve preservar `{{ .ConfirmationURL }}`. O retorno usa `/auth/confirm`, já permitido na lista de redirecionamentos. Abra os links no navegador que iniciou a solicitação (PKCE).
- Teste com uma conta de cliente descartável e dois endereços acessíveis: solicite a troca, confirme ambos, atualize `/conta`, saia e entre com o novo endereço. Confira também confirmação divergente e endereço igual ao atual.
- A troca preserva o ID de usuário, assinatura e permissões. A interface mostra o endereço pendente devolvido pelo Supabase; só trate a alteração como concluída quando o e-mail atual mudar.
- Na troca segura, o primeiro clique retorna uma mensagem sem código de sessão; o callback reconhece esse retorno e orienta confirmar o link na outra caixa de entrada. Não deve orientar recuperação de senha nessa etapa. Após os dois cliques, entrar com o novo endereço e a mesma senha.
- A validação real por SMTP depende da configuração do projeto e deve ser feita antes da publicação. Não use a conta da proprietária para o primeiro teste.

Abra **você** um terminal PowerShell 7 separado, no projeto, e execute:

```powershell
pwsh -File .\scripts\Start-HMLocal.ps1
```

O script pede somente URL e chave pública, ativa cadastros no processo local e mantém pagamentos desativados. Não altera variáveis permanentes do Windows. Não pede nem utiliza chave privilegiada nessa fase.

Quando chegarmos aos testes administrativos que exigem a chave secret, você poderá iniciar outra sessão:

```powershell
pwsh -File .\scripts\Start-HMLocal.ps1 -WithBackendSecret
```

A entrada da chave é oculta e é repassada apenas ao processo do servidor, sem gravá-la no script. Isso evita exposição casual, mas não equivale a esconder o segredo de outros programas com o mesmo nível de acesso. Não execute esse comando no terminal controlado pelo agente se o objetivo for separação de credenciais.

Para verificar a presença das variáveis sem imprimir valores, existe `node scripts/verify-config.mjs`. Execute-o no processo/terminal onde você configurou as variáveis. Ele não lê o ambiente de outro servidor nem procura segredos em arquivos/registro do Windows.

## 6. Criar a proprietária

1. Cadastre `matoshagda@gmail.com` e confirme o e-mail.
2. No SQL Editor, confira a conta correta e execute `database/onboarding/proprietaria.sql`.
3. O script só promove uma conta com esse e-mail **já confirmado**; a aplicação não promove ninguém automaticamente pelo nome ou metadados do cadastro.
4. Entre e abra `/admin`. Crie também uma conta comum de teste e confira que não acessa a administração.

## 7. O que podemos testar juntos

- Sem credenciais: tipos, build, cálculos, migrações e RLS em memória.
- Com servidor de testes iniciado por você: páginas, cadastro, confirmação, login, recuperação e permissões via HTTP/navegador, sem ler chaves.
- Sem Asaas: não conceder acesso real por retornar do checkout nem por mudar dados no navegador. Testar créditos somente no banco isolado/fixtures automatizadas.
- Asaas, antecipação financeira, envio de vídeos reais e exclusão definitiva permanecem em tarefas próprias do backlog.

## Referências

- [Supabase: tipos de chave](https://supabase.com/docs/guides/getting-started/api-keys)
- [OpenAI: proteção de segredos e ambiente do agente](https://learn.chatgpt.com/docs/enterprise/security-cookbook)
