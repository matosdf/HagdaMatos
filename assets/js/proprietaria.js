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

function renderClient(client) {
  const card = document.createElement("article");
  card.className = "client-card";
  const services = client.completed_services || [];
  card.innerHTML = `
    <h3></h3>
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
  `;
  const photos = client.photos || [];
  const pins = client.pinterestSelections || [];
  card.querySelector("h3").textContent = client.full_name;
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

  card.querySelector("[data-pins]").appendChild(renderLinks("Referências do Pinterest", pins, "pin_url"));
  card.querySelector("[data-photos]").appendChild(renderLinks("Fotos liberadas", photos, "image_url"));
  return card;
}

function formatBirthday(value) {
  if (!value) return "não informado";
  const [year, month, day] = value.slice(0, 10).split("-");
  if (!year || !month || !day) return "não informado";
  return `${day}/${month}`;
}

function renderLinks(title, items, urlKey) {
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
    const link = document.createElement("a");
    link.href = item[urlKey];
    link.target = "_blank";
    link.rel = "noopener";
    link.textContent = item.title || item[urlKey];
    wrapper.appendChild(link);
  });
  return wrapper;
}

async function loadClients() {
  const statusEl = document.querySelector("#owner-status");
  try {
    statusEl.textContent = "Carregando clientes...";
    const data = await requestJson("/api/admin-clients");
    const list = document.querySelector("#clients-list");
    list.innerHTML = "";
    data.clients.forEach(client => list.appendChild(renderClient(client)));
    statusEl.textContent = data.clients.length ? "" : "Nenhuma cliente cadastrada ainda.";
  } catch (error) {
    window.location.href = "/login.html";
  }
}

document.querySelector("[data-logout]").addEventListener("click", logout);
loadClients();
