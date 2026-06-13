# Portal Vercel

Esta branch prepara o site para rodar na Vercel com páginas públicas estáticas e uma área reservada com APIs serverless.

## Variáveis de ambiente

Configure na Vercel:

- `DATABASE_URL` ou `POSTGRES_URL`: conexão PostgreSQL.
- `SUPABASE_DB_CA_BASE64`: certificado raiz do banco Supabase codificado em Base64.
- `SUPABASE_URL`: URL pública do projeto Supabase.
- `SUPABASE_PUBLISHABLE_KEY`: chave publicável do Supabase. Projetos antigos podem usar `SUPABASE_ANON_KEY`.
- `SUPABASE_SECRET_KEY`: chave secreta usada somente no backend para enviar convites e desativar acessos.
- `CRON_SECRET`: segredo para proteger rotas agendadas.
- `TELEGRAM_BOT_TOKEN`: token do bot criado no BotFather.
- `TELEGRAM_OWNER_CHAT_ID`: chat da proprietária que receberá os lembretes.

Exemplo para gerar um segredo local:

```powershell
[Convert]::ToBase64String((1..48 | ForEach-Object { Get-Random -Maximum 256 }))
```

Para configurar a validação TLS do banco:

1. No painel Supabase, abra `Database` → `Settings` → `SSL Configuration`.
2. Ative `Enforce SSL on incoming connections` e baixe o certificado raiz.
3. Converta o arquivo para Base64:

```powershell
[Convert]::ToBase64String([IO.File]::ReadAllBytes("C:\caminho\prod-ca-2021.crt"))
```

4. Salve o resultado na Vercel como `SUPABASE_DB_CA_BASE64`.

O backend recusa conexões externas quando esse certificado não está configurado ou é inválido.

## Banco de dados

Execute o schema em `database/schema.sql` no PostgreSQL.

Execute também `database/002_supabase_auth.sql` caso o schema inicial tenha sido aplicado
antes da migração para Supabase Auth.

Execute `database/003_client_management.sql` para habilitar cadastro, convite e
desativação de clientes pela área da proprietária.

Tabelas principais:

- `clients`: nome da cliente, data de aniversário, telefone, e-mail, serviços realizados e observações importantes.
- `profiles`: associa usuários do Supabase Auth aos papéis `client` ou `owner`.
- `client_photos`: fotos e referências visuais associadas à cliente.
- `client_pinterest_selections`: links do Pinterest salvos pela cliente para revisão da proprietária.
- `birthday_notifications`: histórico de lembretes de aniversário enviados.

## Supabase Auth

As senhas e sessões são gerenciadas pelo Supabase Auth. O backend mantém os tokens
em cookies `HttpOnly` e consulta `profiles` para autorizar cada rota.

Para criar a primeira proprietária:

1. No Supabase, abra `Authentication` → `Users` e crie a usuária.
2. Copie o UUID dessa usuária.
3. No SQL Editor, execute:

```sql
insert into public.profiles (auth_user_id, role)
values ('UUID_DA_USUARIA', 'owner');
```

Para criar uma cliente:

1. Cadastre a cliente e obtenha seu UUID:

```sql
insert into clients (full_name, birth_date, contact_phone, email, completed_services, important_notes)
values (
  'Nome da Cliente',
  '1990-06-15',
  '+55 12 99999-9999',
  'cliente@exemplo.com',
  array['Coloração pessoal', 'Análise de estilo'],
  'Observações importantes da consultoria.'
)
returning id;
```

2. Crie a usuária em `Authentication` → `Users`.
3. Associe os UUIDs:

```sql
insert into public.profiles (auth_user_id, role, client_id)
values ('UUID_DA_USUARIA', 'client', 'UUID_DA_CLIENTE');
```

Em `Authentication` → `URL Configuration`, configure:

- Site URL: `https://hagda-matos.vercel.app`
- Redirect URL permitida: `https://hagda-matos.vercel.app/redefinir-senha.html`

Se a URL de redefinição não estiver explicitamente permitida, o Supabase ignora o
destino solicitado e redireciona convites para a `Site URL`.

Para personalizar o convite, abra `Authentication` → `Email Templates` → `Invite user`.
O botão ou link principal do modelo deve apontar para:

```html
<a href="{{ .ConfirmationURL }}">Aceitar convite</a>
```

Não substitua `ConfirmationURL` por `SiteURL`, pois isso leva a cliente para a página
principal sem concluir o convite.

## Gestão de clientes

A área da proprietária permite:

- cadastrar e editar clientes;
- enviar um convite de acesso separado do cadastro;
- desativar e reativar o acesso sem apagar os dados;
- consultar serviços, observações, fotos e referências.

Para habilitar convites e controle de acesso, crie `SUPABASE_SECRET_KEY` na Vercel
usando a chave secreta encontrada em `Project Settings` → `API Keys`.

Essa chave deve existir somente nas variáveis do backend da Vercel. Nunca a coloque
em HTML, JavaScript do navegador, commits, mensagens ou capturas de tela.

## Lembretes de aniversário por Telegram

O cron está configurado em `vercel.json` para executar diariamente às 11:00 UTC, que equivale a 08:00 em São Paulo.

Rota executada:

```txt
/api/cron/birthdays
```

O job consulta aniversariantes do dia e dos próximos 7 dias, envia uma mensagem para a proprietária via Telegram e registra em `birthday_notifications` para evitar repetição.

Para criar o bot:

1. No Telegram, converse com `@BotFather`.
2. Crie um bot e copie o token.
3. Envie uma mensagem para o bot pelo Telegram da proprietária.
4. Obtenha o `chat_id` usando o método `getUpdates` ou outra ferramenta segura.
5. Configure `TELEGRAM_BOT_TOKEN`, `TELEGRAM_OWNER_CHAT_ID` e `CRON_SECRET` na Vercel.

Para testar manualmente depois do deploy:

```powershell
curl.exe -H "Authorization: Bearer SEU_CRON_SECRET" https://www.hagda.com.br/api/cron/birthdays
```

## Segurança

- Sessão via cookies `HttpOnly`, `SameSite=Strict`, `Secure` e prefixo `__Host-` em produção.
- Credenciais, recuperação de senha e rotação de tokens gerenciadas pelo Supabase Auth.
- Conexão PostgreSQL com TLS e validação estrita do certificado raiz do Supabase.
- RLS habilitado nas tabelas privadas, com isolamento por cliente e papel.
- Páginas internas têm `noindex, nofollow`.
- APIs retornam dados apenas depois de validar a sessão e a função do usuário.

## Próximas evoluções

- Tela administrativa para cadastrar clientes sem SQL manual.
- Upload autenticado de PDFs e fotos em Vercel Blob, S3 ou Supabase Storage.
- Integração oficial com Pinterest OAuth se a feature for validada.
