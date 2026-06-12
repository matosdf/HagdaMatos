const { hashPassword } = require("../api/_lib/security");

function readHidden(prompt) {
  return new Promise((resolve, reject) => {
    if (!process.stdin.isTTY || !process.stdin.setRawMode) {
      reject(new Error("Execute este comando diretamente em um terminal interativo."));
      return;
    }

    let value = "";
    process.stdout.write(prompt);
    process.stdin.setRawMode(true);
    process.stdin.resume();
    process.stdin.setEncoding("utf8");

    function finish(error) {
      process.stdin.setRawMode(false);
      process.stdin.pause();
      process.stdin.removeListener("data", onData);
      process.stdout.write("\n");
      if (error) reject(error);
      else resolve(value);
    }

    function onData(character) {
      if (character === "\u0003") return finish(new Error("Operação cancelada."));
      if (character === "\r" || character === "\n") return finish();
      if (character === "\u007f" || character === "\b") {
        value = value.slice(0, -1);
        return;
      }
      if (!character.startsWith("\u001b")) value += character;
    }

    process.stdin.on("data", onData);
  });
}

async function main() {
  if (process.argv[2]) {
    throw new Error("Não informe a senha no comando. Ela será solicitada de forma oculta.");
  }

  const password = await readHidden("Digite a senha: ");
  if (password.length < 12) throw new Error("A senha precisa ter pelo menos 12 caracteres.");

  const confirmation = await readHidden("Confirme a senha: ");
  if (password !== confirmation) throw new Error("As senhas não coincidem.");

  const { salt, hash } = await hashPassword(password);
  console.log(JSON.stringify({ salt, hash }, null, 2));
}

main().catch(error => {
  console.error(error);
  process.exit(1);
});
