const form = document.querySelector("#login-form");
const statusEl = document.querySelector("#login-status");

form.addEventListener("submit", async event => {
  event.preventDefault();
  statusEl.textContent = "Verificando credenciais...";
  statusEl.className = "status";

  const payload = Object.fromEntries(new FormData(form).entries());

  try {
    const response = await fetch("/api/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });
    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || "Não foi possível entrar.");
    }

    window.location.href = data.redirectTo;
  } catch (error) {
    statusEl.textContent = error.message;
    statusEl.className = "status error";
  }
});
