const form = document.querySelector("#password-form");
const statusEl = document.querySelector("#password-status");
const hash = new URLSearchParams(window.location.hash.slice(1));
const accessToken = hash.get("access_token");
window.history.replaceState(null, "", window.location.pathname);

if (!accessToken || hash.get("type") !== "recovery") {
  statusEl.textContent = "Link inválido ou expirado. Solicite uma nova recuperação.";
  statusEl.className = "status error";
  form.querySelector("button").disabled = true;
}

form.addEventListener("submit", async event => {
  event.preventDefault();
  const data = Object.fromEntries(new FormData(form).entries());
  if (data.password !== data.confirmation) {
    statusEl.textContent = "As senhas não coincidem.";
    statusEl.className = "status error";
    return;
  }

  statusEl.textContent = "Atualizando senha...";
  statusEl.className = "status";
  try {
    const response = await fetch("/api/update-password", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ accessToken, password: data.password })
    });
    const payload = await response.json();
    if (!response.ok) throw new Error(payload.error || "Não foi possível atualizar a senha.");
    statusEl.textContent = "Senha atualizada. Redirecionando para o login...";
    setTimeout(() => {
      window.location.href = "/login.html";
    }, 1200);
  } catch (error) {
    statusEl.textContent = error.message;
    statusEl.className = "status error";
  }
});
