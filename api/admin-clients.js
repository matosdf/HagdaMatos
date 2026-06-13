const { query } = require("./_lib/db");
const { sendJson, readJson, methodNotAllowed, requireSameOrigin } = require("./_lib/http");
const { authHeaders, requireRole } = require("./_lib/security");

module.exports = async function handler(req, res) {
  if (req.method === "GET") return listClients(req, res);
  if (req.method === "POST") return createClient(req, res);
  if (req.method === "PATCH") return updateClient(req, res);
  return methodNotAllowed(res);
};

async function listClients(req, res) {
  try {
    const session = await requireRole(req, ["owner"]);
    const clientsResult = await query(
      `select
         c.id, c.full_name, c.birth_date, c.contact_phone, c.email,
         c.completed_services, c.important_notes, c.seasonal_pdf_url,
         c.is_active, p.auth_user_id, p.is_active as access_active
       from clients c
       left join profiles p on p.client_id = c.id and p.role = 'client'
       order by c.full_name asc`
    );
    const clientIds = clientsResult.rows.map(client => client.id);

    if (!clientIds.length) {
      return sendJson(res, 200, { clients: [] }, authHeaders(session));
    }

    const photosResult = await query(
      `select id, client_id, title, image_url, notes, created_at
       from client_photos
       where client_id = any($1::uuid[])
       order by created_at desc`,
      [clientIds]
    );
    const pinsResult = await query(
      `select id, client_id, pin_url, title, notes, created_at
       from client_pinterest_selections
       where client_id = any($1::uuid[])
       order by created_at desc`,
      [clientIds]
    );

    const photosByClient = groupByClient(photosResult.rows);
    const pinsByClient = groupByClient(pinsResult.rows);
    const clients = clientsResult.rows.map(client => ({
      ...client,
      photos: photosByClient[client.id] || [],
      pinterestSelections: pinsByClient[client.id] || []
    }));

    return sendJson(res, 200, { clients }, authHeaders(session));
  } catch (error) {
    return handleError(res, error, "Erro ao carregar clientes.");
  }
}

async function createClient(req, res) {
  try {
    requireSameOrigin(req);
    const session = await requireRole(req, ["owner"]);
    const input = normalizeClient(await readJson(req));
    const validationError = validateClient(input);
    if (validationError) return sendJson(res, 400, { error: validationError }, authHeaders(session));

    const result = await query(
      `insert into clients
         (full_name, birth_date, contact_phone, email, completed_services, important_notes)
       values ($1, $2, $3, $4, $5, $6)
       returning id, full_name, birth_date, contact_phone, email, completed_services,
         important_notes, seasonal_pdf_url, is_active`,
      [
        input.fullName,
        input.birthDate,
        input.contactPhone,
        input.email,
        input.completedServices,
        input.importantNotes
      ]
    );

    return sendJson(res, 201, { client: result.rows[0] }, authHeaders(session));
  } catch (error) {
    if (error.code === "23505") {
      return sendJson(res, 409, { error: "Já existe uma cliente com esse e-mail." });
    }
    return handleError(res, error, "Erro ao cadastrar cliente.");
  }
}

async function updateClient(req, res) {
  try {
    requireSameOrigin(req);
    const session = await requireRole(req, ["owner"]);
    const body = await readJson(req);
    const clientId = String(body.clientId || "");
    const input = normalizeClient(body);
    const validationError = validateClient(input);
    if (!isUuid(clientId)) return sendJson(res, 400, { error: "Cliente inválida." }, authHeaders(session));
    if (validationError) return sendJson(res, 400, { error: validationError }, authHeaders(session));

    const currentResult = await query(
      `select c.email, p.auth_user_id
       from clients c
       left join profiles p on p.client_id = c.id and p.role = 'client'
       where c.id = $1
       limit 1`,
      [clientId]
    );
    const current = currentResult.rows[0];
    if (!current) return sendJson(res, 404, { error: "Cliente não encontrada." }, authHeaders(session));
    if (current.auth_user_id && current.email !== input.email) {
      return sendJson(res, 409, {
        error: "O e-mail não pode ser alterado depois que o acesso foi convidado."
      }, authHeaders(session));
    }

    const result = await query(
      `update clients
       set full_name = $2,
           birth_date = $3,
           contact_phone = $4,
           email = $5,
           completed_services = $6,
           important_notes = $7,
           updated_at = now()
       where id = $1
       returning id, full_name, birth_date, contact_phone, email, completed_services,
         important_notes, seasonal_pdf_url, is_active`,
      [
        clientId,
        input.fullName,
        input.birthDate,
        input.contactPhone,
        input.email,
        input.completedServices,
        input.importantNotes
      ]
    );
    return sendJson(res, 200, { client: result.rows[0] }, authHeaders(session));
  } catch (error) {
    if (error.code === "23505") {
      return sendJson(res, 409, { error: "Já existe uma cliente com esse e-mail." });
    }
    return handleError(res, error, "Erro ao atualizar cliente.");
  }
}

function normalizeClient(body) {
  return {
    fullName: String(body.fullName || "").trim(),
    birthDate: String(body.birthDate || "").trim() || null,
    contactPhone: String(body.contactPhone || "").trim() || null,
    email: String(body.email || "").trim().toLowerCase(),
    completedServices: String(body.completedServices || "")
      .split(",")
      .map(service => service.trim())
      .filter(Boolean)
      .slice(0, 30),
    importantNotes: String(body.importantNotes || "").trim() || null
  };
}

function validateClient(input) {
  if (input.fullName.length < 2 || input.fullName.length > 120) return "Informe o nome completo da cliente.";
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(input.email) || input.email.length > 254) return "Informe um e-mail válido.";
  if (input.birthDate && !isIsoDate(input.birthDate)) return "Informe uma data de aniversário válida.";
  if (input.contactPhone?.length > 40) return "O telefone informado é muito longo.";
  if (input.importantNotes?.length > 4000) return "As observações devem ter no máximo 4.000 caracteres.";
  if (input.completedServices.some(service => service.length > 120)) return "Cada serviço deve ter no máximo 120 caracteres.";
  return null;
}

function handleError(res, error, fallback) {
  const status = error.code === "UNAUTHORIZED" ? 401 : error.code === "INVALID_ORIGIN" ? 403 : 500;
  return sendJson(res, status, {
    error: error.code === "UNAUTHORIZED" ? "Acesso não autorizado." : fallback
  }, authHeaders(error));
}

function groupByClient(rows) {
  return rows.reduce((groups, row) => {
    if (!groups[row.client_id]) groups[row.client_id] = [];
    groups[row.client_id].push(row);
    return groups;
  }, {});
}

function isUuid(value) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
}

function isIsoDate(value) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const date = new Date(`${value}T00:00:00Z`);
  return !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value;
}
