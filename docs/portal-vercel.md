# Portal Vercel

Esta branch prepara o site para rodar na Vercel com páginas públicas estáticas e uma área reservada com APIs serverless.

## Variáveis de ambiente

Configure na Vercel:

- `DATABASE_URL` ou `POSTGRES_URL`: conexão PostgreSQL.
- `SESSION_SECRET`: string aleatória com pelo menos 32 caracteres.
- `CRON_SECRET`: segredo para proteger rotas agendadas.
- `TELEGRAM_BOT_TOKEN`: token do bot criado no BotFather.
- `TELEGRAM_OWNER_CHAT_ID`: chat da proprietária que receberá os lembretes.

Exemplo para gerar um segredo local:

```powershell
[Convert]::ToBase64String((1..48 | ForEach-Object { Get-Random -Maximum 256 }))
```

## Banco de dados

Execute o schema em `database/schema.sql` no PostgreSQL.

Tabelas principais:

- `clients`: nome da cliente, data de aniversário, telefone, e-mail, serviços realizados e observações importantes.
- `app_users`: usuários de login com `role` `client` ou `owner`.
- `client_photos`: fotos e referências visuais associadas à cliente.
- `client_pinterest_selections`: links do Pinterest salvos pela cliente para revisão da proprietária.
- `birthday_notifications`: histórico de lembretes de aniversário enviados.

## Senhas

As senhas não devem ser salvas em texto puro. Gere hash e salt com:

```powershell
$env:SESSION_SECRET="uma-string-segura-com-mais-de-32-caracteres"
node scripts/create-password-hash.js "senha-da-pessoa"
```

O resultado gera:

```json
{
  "salt": "...",
  "hash": "..."
}
```

Use esses valores ao inserir em `app_users`.

Exemplo de proprietária:

```sql
insert into app_users (email, password_hash, password_salt, role)
values ('email-da-proprietaria@exemplo.com', 'HASH_GERADO', 'SALT_GERADO', 'owner');
```

Exemplo de cliente:

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

insert into app_users (email, password_hash, password_salt, role, client_id)
values ('cliente@exemplo.com', 'HASH_GERADO', 'SALT_GERADO', 'client', 'ID_RETORNADO');
```

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

- Sessão via cookie `HttpOnly`, `SameSite=Lax` e `Secure` em produção.
- Senha validada com hash `scrypt`, salt individual e comparação em tempo constante.
- Páginas internas têm `noindex, nofollow`.
- APIs retornam dados apenas depois de validar a sessão e a função do usuário.

## Próximas evoluções

- Tela administrativa para cadastrar clientes sem SQL manual.
- Upload autenticado de PDFs e fotos em Vercel Blob, S3 ou Supabase Storage.
- Integração oficial com Pinterest OAuth se a feature for validada.
