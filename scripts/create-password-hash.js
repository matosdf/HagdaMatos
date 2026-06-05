const { hashPassword } = require("../api/_lib/security");

async function main() {
  const password = process.argv[2];
  if (!password) {
    console.error("Uso: SESSION_SECRET='...' node scripts/create-password-hash.js 'senha-segura'");
    process.exit(1);
  }

  const { salt, hash } = await hashPassword(password);
  console.log(JSON.stringify({ salt, hash }, null, 2));
}

main().catch(error => {
  console.error(error);
  process.exit(1);
});
