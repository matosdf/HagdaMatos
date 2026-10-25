// O relatório imprime apenas presença/ausência, nunca valores, prefixos ou hashes de chaves.
const groups = {
  autenticação: [
    ['URL pública', Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL)],
    ['Chave publicável', Boolean(process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY)],
    ['URL da aplicação', Boolean(process.env.NEXT_PUBLIC_APP_URL)],
  ],
  backend: [['Chave secreta do Supabase', Boolean(process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY)]],
};
for (const [group, checks] of Object.entries(groups)) {
  console.log(group.toUpperCase());
  for (const [name, ok] of checks) console.log(`${ok ? 'CONFIGURADO' : 'PENDENTE'}: ${name}`);
}
console.log('Asaas permanece no backlog. Este comando não abre conexões nem altera serviços.');
