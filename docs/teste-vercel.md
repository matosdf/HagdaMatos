# Testar a branch na Vercel sem migrar o site antigo

Branch: `refatoracao_area_exclusiva`. O site de `hagda.com.br` permanece no GitHub Pages; não alterar sua configuração de Pages, branch de publicação ou DNS nesta etapa.

## Publicação da branch

1. Criar o commit local. Enviar essa branch ao GitHub somente após autorização específica para o push.
2. O projeto Vercel conectado pode gerar um Preview da branch. Isso não troca automaticamente o site servido pelo domínio ligado a Production.
3. Para testar em `www.hmpp.com.br`, em Settings → Domains → Edit desse domínio, selecionar Preview e informar a Git Branch `refatoracao_area_exclusiva`. Manter `hmpp.com.br` redirecionando para `www.hmpp.com.br`.
4. Fazer um novo deployment da branch após configurar domínio e variáveis. Manter a Production Branch atual e a `main` sem alteração nesta etapa.
5. Se usar a URL gerada `.vercel.app`, configurar a URL exata em `NEXT_PUBLIC_APP_URL` e nos retornos do Supabase. Não usar dois hosts diferentes no mesmo teste: a validação de origem exige o host configurado e o PKCE depende do navegador que iniciou a operação.

## Variáveis do ambiente Preview / branch

Configurar pelo painel, sem colocar valores em mensagens, screenshots ou Git:

| Variável | Valor para o teste no domínio novo |
| --- | --- |
| `NEXT_PUBLIC_APP_URL` | `https://www.hmpp.com.br` |
| `NEXT_PUBLIC_SUPABASE_URL` | URL do projeto Supabase de teste |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | Chave pública do mesmo projeto |
| `REGISTRATION_ENABLED` | `true` |
| `BILLING_ENABLED` | `false` |
| `ASAAS_INTEGRATION_READY` | `false` |
| `ASAAS_ALLOW_PRODUCTION` | `false` |
| `LEGAL_DOCUMENTS_APPROVED` | `false` |

Não é necessário configurar segredo Asaas. Cadastro, login, recuperação e troca de e-mail usam a chave pública com a sessão da cliente. Somente operações administrativas que usam `adminClient()` precisam de `SUPABASE_SECRET_KEY`, a ser inserida diretamente no painel quando formos testá-las. A chave Resend permanece no SMTP do Supabase, não é necessária na Vercel para esses e-mails.

Configurar Framework Preset Next.js, diretório raiz do repositório, build `npm run build` e saída padrão do Next.js; revisar overrides herdados da publicação estática antiga. Não configurar saída como `public`.

## Supabase e ensaio

- Conferir migrações 002 e 003 já aplicadas e o bucket privado. Não executar migrações novamente automaticamente no deploy.
- Acrescentar `https://www.hmpp.com.br/auth/confirm` e `https://www.hmpp.com.br/auth/confirm?next=/conta/nova-senha` à lista de retornos autorizados. Preservar localhost enquanto os testes locais continuarem. Site URL pode ser atualizado ao endereço novo quando ele estiver servindo esta aplicação.
- Manter Confirm Email e Secure email change habilitados; SMTP Resend e templates configurados no Supabase.
- Testar cadastro com e-mail acessível, confirmação no mesmo navegador, login, recuperação de senha, troca de e-mail com as confirmações exigidas e novo login. Não testar primeiro na conta da proprietária.
- Sem sessão, `/conta`, `/membros` e `/admin` devem pedir login. Uma cliente sem período pago não pode abrir biblioteca nem administração. Cobranças devem permanecer indisponíveis.
- URL não divulgada ainda é pública. Revisar Deployment Protection do Preview para restringir os testes; não usar contas reais de clientes nessa etapa.
- Nenhuma mudança de endereço no Google Search Console nesta etapa. A migração de `hagda.com.br`, redirects permanentes e revisão de indexação ficam para depois da homologação.

## Referências

- [Vercel: domínio associado a uma branch](https://vercel.com/docs/domains/working-with-domains/assign-domain-to-a-git-branch)
- [Vercel: ambientes de deploy](https://vercel.com/docs/deployments/environments)
