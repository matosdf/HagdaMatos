const statusEl = document.querySelector("#owner-status");
const clientList = document.querySelector("#clients-list");
const dialog = document.querySelector("#client-dialog");
const form = document.querySelector("#client-form");
const formStatus = document.querySelector("#client-form-status");
let clients = [];

async function requestJson(url, options) {
  const response = await fetch(url, options);
  const data = await response.json();
  if (!response.ok) {
    const error = new Error(data.error || "Erro ao carregar dados.");
    error.status = response.status;
    throw error;
  }
  return data;
}

async function logout() {
  await fetch("/api/logout", { method: "POST" });
  window.location.href = "/login.html";
}

function renderClient(client) {
  const card = document.createElement("article");
  card.className = `client-card${client.is_active ? "" : " client-card-inactive"}`;
  const services = client.completed_services || [];
  const photos = client.photos || [];
  const pins = client.pinterestSelections || [];
  const accessLabel = !client.auth_user_id
    ? "Acesso não convidado"
    : client.access_active
      ? "Acesso ativo"
      : "Acesso desativado";

  card.innerHTML = `
    <header class="client-card-header">
      <div>
        <p class="eyebrow" data-access></p>
        <h3></h3>
      </div>
      <div class="inline-actions">
        <button class="button-quiet button-small" type="button" data-edit>Editar</button>
        <button class="button-small" type="button" data-access-action></button>
      </div>
    </header>
    <div class="client-meta">
      <span data-phone></span>
      <span data-email></span>
      <span data-birthday></span>
      <span data-counts></span>
    </div>
    <div class="tag-list"></div>
    <p data-notes></p>
    <div data-pins></div>
    <div data-photos></div>
    <p class="status" data-action-status role="status"></p>
  `;

  card.querySelector("h3").textContent = client.full_name;
  card.querySelector("[data-access]").textContent = accessLabel;
  card.querySelector("[data-phone]").textContent = `Telefone: ${client.contact_phone || "não informado"}`;
  card.querySelector("[data-email]").textContent = `E-mail: ${client.email}`;
  card.querySelector("[data-birthday]").textContent = `Aniversário: ${formatBirthday(client.birth_date)}`;
  card.querySelector("[data-counts]").textContent = `Fotos: ${photos.length} · Pinterest: ${pins.length}`;
  card.querySelector("[data-notes]").textContent = client.important_notes || "Sem observações importantes cadastradas.";

  const tagList = card.querySelector(".tag-list");
  services.forEach(service => {
    const tag = document.createElement("span");
    tag.textContent = service;
    tagList.appendChild(tag);
  });

  card.querySelector("[data-pins]").appendChild(renderLinks("Referências do Pinterest", pins, "pin_url", true));
  card.querySelector("[data-photos]").appendChild(renderLinks("Fotos liberadas", photos, "image_url", false));
  card.querySelector("[data-edit]").addEventListener("click", () => openClientForm(client));

  const accessButton = card.querySelector("[data-access-action]");
  const action = !client.auth_user_id ? "invite" : client.access_active ? "deactivate" : "activate";
  accessButton.textContent = action === "invite" ? "Enviar convite" : action === "activate" ? "Reativar acesso" : "Desativar acesso";
  if (action === "deactivate") accessButton.classList.add("button-danger");
  accessButton.addEventListener("click", () => changeAccess(client, action, card));

  return card;
}

function openClientForm(client = null) {
  form.reset();
  formStatus.textContent = "";
  document.querySelector("#client-form-title").textContent = client ? "Editar cliente" : "Cadastrar cliente";
  if (client) {
    form.elements.clientId.value = client.id;
    form.elements.fullName.value = client.full_name;
    form.elements.email.value = client.email;
    form.elements.contactPhone.value = client.contact_phone || "";
    form.elements.birthDate.value = client.birth_date?.slice(0, 10) || "";
    form.elements.completedServices.value = (client.completed_services || []).join(", ");
    form.elements.importantNotes.value = client.important_notes || "";
  }
  dialog.showModal();
}

async function saveClient(event) {
  event.preventDefault();
  const payload = Object.fromEntries(new FormData(form).entries());
  const editing = Boolean(payload.clientId);
  formStatus.textContent = editing ? "Salvando alterações..." : "Cadastrando cliente...";
  formStatus.className = "status";

  try {
    await requestJson("/api/admin-clients", {
      method: editing ? "PATCH" : "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });
    dialog.close();
    await loadClients(editing ? "Cliente atualizada." : "Cliente cadastrada. O acesso ainda não foi convidado.");
  } catch (error) {
    formStatus.textContent = error.message;
    formStatus.className = "status error";
  }
}

async function changeAccess(client, action, card) {
  const actionStatus = card.querySelector("[data-action-status]");
  if (action === "deactivate") {
    const confirmed = window.confirm(`Desativar o acesso de ${client.full_name}? Os dados serão preservados.`);
    if (!confirmed) return;
  }

  actionStatus.textContent = action === "invite" ? "Enviando convite..." : "Atualizando acesso...";
  actionStatus.className = "status";
  try {
    const data = await requestJson("/api/admin-client-access", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ clientId: client.id, action })
    });
    await loadClients(data.message);
  } catch (error) {
    actionStatus.textContent = error.message;
    actionStatus.className = "status error";
  }
}

function formatBirthday(value) {
  if (!value) return "não informado";
  const [year, month, day] = value.slice(0, 10).split("-");
  if (!year || !month || !day) return "não informado";
  return `${day}/${month}`;
}

function renderLinks(title, items, urlKey, showNotes) {
  const wrapper = document.createElement("div");
  wrapper.className = "reference-list";
  const heading = document.createElement("h4");
  heading.textContent = title;
  wrapper.appendChild(heading);

  if (!items.length) {
    const empty = document.createElement("p");
    empty.className = "muted";
    empty.textContent = "Nenhum item cadastrado.";
    wrapper.appendChild(empty);
    return wrapper;
  }

  items.forEach(item => {
    const itemWrapper = document.createElement("article");
    itemWrapper.className = "reference-item";
    const link = document.createElement("a");
    link.href = item[urlKey];
    link.target = "_blank";
    link.rel = "noopener";
    link.textContent = item.title || item[urlKey];
    itemWrapper.appendChild(link);
    if (showNotes) {
      const notes = document.createElement("p");
      notes.textContent = item.notes || "Sem observação enviada pela cliente.";
      itemWrapper.appendChild(notes);
    }
    wrapper.appendChild(itemWrapper);
  });
  return wrapper;
}

async function loadClients(message = "") {
  try {
    statusEl.textContent = "Carregando clientes...";
    statusEl.className = "status";
    const data = await requestJson("/api/admin-clients");
    clients = data.clients;
    clientList.innerHTML = "";
    clients.forEach(client => clientList.appendChild(renderClient(client)));
    statusEl.textContent = message || (clients.length ? "" : "Nenhuma cliente cadastrada ainda.");
  } catch (error) {
    if (error.status === 401) window.location.href = "/login.html";
    else {
      statusEl.textContent = error.message;
      statusEl.className = "status error";
    }
  }
}

document.querySelector("[data-logout]").addEventListener("click", logout);
document.querySelector("#new-client").addEventListener("click", () => openClientForm());
document.querySelectorAll("[data-close-dialog]").forEach(button => {
  button.addEventListener("click", () => dialog.close());
});
form.addEventListener("submit", saveClient);
loadClients();
