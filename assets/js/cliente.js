async function requestJson(url, options) {
  const response = await fetch(url, options);
  const data = await response.json();
  if (!response.ok) throw new Error(data.error || "Erro ao carregar dados.");
  return data;
}

async function logout() {
  await fetch("/api/logout", { method: "POST" });
  window.location.href = "/login.html";
}

function renderList(container, items, emptyMessage, renderItem) {
  container.innerHTML = "";
  if (!items.length) {
    const empty = document.createElement("p");
    empty.className = "muted";
    empty.textContent = emptyMessage;
    container.appendChild(empty);
    return;
  }

  items.forEach(item => container.appendChild(renderItem(item)));
}

function createCard(title, text, link) {
  const card = document.createElement("article");
  card.className = "client-card";
  card.innerHTML = `<h3></h3><p></p>`;
  card.querySelector("h3").textContent = title || "Referência";
  card.querySelector("p").textContent = text || "";
  if (link) {
    const anchor = document.createElement("a");
    anchor.href = link;
    anchor.target = "_blank";
    anchor.rel = "noopener";
    anchor.textContent = "Abrir";
    card.appendChild(anchor);
  }
  return card;
}

function createSocialReferenceCard(reference) {
  const card = createCard(networkLabel(reference.network), reference.notes || "Sem observação.", reference.social_url);
  card.classList.add("reference-card");

  const removeButton = document.createElement("button");
  removeButton.type = "button";
  removeButton.className = "icon-button";
  removeButton.setAttribute("aria-label", "Excluir referência");
  removeButton.title = "Excluir referência";
  removeButton.textContent = "×";
  removeButton.addEventListener("click", () => deleteSocialReference(reference, removeButton));
  card.prepend(removeButton);
  return card;
}

async function deleteSocialReference(reference, button) {
  const confirmed = window.confirm("Excluir esta referência de rede social?");
  if (!confirmed) return;

  const statusEl = document.querySelector("#social-reference-status");
  button.disabled = true;
  statusEl.textContent = "Excluindo referência...";
  statusEl.className = "status";
  try {
    await requestJson("/api/social-reference", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ referenceId: reference.id })
    });
    await loadDashboard({ redirectOnUnauthorized: false });
    statusEl.textContent = "Referência excluída.";
  } catch (error) {
    statusEl.textContent = error.message;
    statusEl.className = "status error";
    button.disabled = false;
  }
}

function networkLabel(network) {
  if (network === "linkedin") return "LinkedIn";
  if (network === "instagram") return "Instagram";
  return "Referência anterior";
}

async function loadDashboard({ redirectOnUnauthorized = true } = {}) {
  try {
    const data = await requestJson("/api/client-dashboard");
    document.querySelector("#client-name").textContent = `Olá, ${data.client.full_name}`;

    if (data.seasonalGuide.pdfUrl) {
      const link = document.querySelector("#seasonal-link");
      link.href = data.seasonalGuide.pdfUrl;
      link.hidden = false;
      document.querySelector("#seasonal-guide").textContent = "Seu guia de tendências da estação já está disponível.";
    }

    renderList(
      document.querySelector("#photos-list"),
      data.photos,
      "Nenhuma foto liberada ainda.",
      photo => createCard(photo.title, photo.notes, photo.image_url)
    );
    renderList(
      document.querySelector("#social-references-list"),
      data.socialReferences,
      "Nenhuma referência salva ainda.",
      createSocialReferenceCard
    );
  } catch (error) {
    if (redirectOnUnauthorized) window.location.href = "/login.html";
    else throw error;
  }
}

document.querySelector("[data-logout]").addEventListener("click", logout);
document.querySelector("#social-reference-form").addEventListener("submit", async event => {
  event.preventDefault();
  const form = event.currentTarget;
  const submitButton = form.querySelector('button[type="submit"]');
  const statusEl = document.querySelector("#social-reference-status");
  statusEl.textContent = "Salvando referência...";
  statusEl.className = "status";
  submitButton.disabled = true;

  try {
    const payload = Object.fromEntries(new FormData(form).entries());
    await requestJson("/api/social-reference", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });
    form.reset();
    await loadDashboard({ redirectOnUnauthorized: false });
    statusEl.textContent = "Referência salva.";
  } catch (error) {
    statusEl.textContent = error.message;
    statusEl.className = "status error";
  } finally {
    submitButton.disabled = false;
  }
});

loadDashboard();
