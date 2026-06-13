const { query } = require("./_lib/db");
const { sendJson, readJson, methodNotAllowed, requireSameOrigin } = require("./_lib/http");
const { authHeaders, requireRole } = require("./_lib/security");

module.exports = async function handler(req, res) {
  if (!["POST", "DELETE"].includes(req.method)) return methodNotAllowed(res);

  try {
    requireSameOrigin(req);
    const session = await requireRole(req, ["client"]);
    if (req.method === "DELETE") return deleteSelection(req, res, session);

    const { pinUrl, title, notes } = await readJson(req);
    const url = String(pinUrl || "").trim();
    const normalizedTitle = String(title || "").trim() || null;
    const normalizedNotes = String(notes || "").trim() || null;

    if (!url || !/^https:\/\/([a-z0-9-]+\.)?pinterest\./i.test(url)) {
      return sendJson(res, 400, { error: "Informe um link válido do Pinterest começando com https://." });
    }
    if (url.length > 2048) return sendJson(res, 400, { error: "O link informado é muito longo." });
    if (normalizedTitle?.length > 160) return sendJson(res, 400, { error: "O título deve ter no máximo 160 caracteres." });
    if (normalizedNotes?.length > 2000) return sendJson(res, 400, { error: "A observação deve ter no máximo 2.000 caracteres." });

    const result = await query(
      `insert into client_pinterest_selections (client_id, pin_url, title, notes)
       values ($1, $2, $3, $4)
       returning id, pin_url, title, notes, created_at`,
      [session.clientId, url, normalizedTitle, normalizedNotes]
    );

    return sendJson(res, 201, { selection: result.rows[0] }, authHeaders(session));
  } catch (error) {
    const status = error.code === "UNAUTHORIZED" ? 401 : error.code === "INVALID_ORIGIN" ? 403 : 500;
    return sendJson(res, status, {
      error: error.code === "UNAUTHORIZED" ? "Acesso não autorizado." : "Erro ao salvar referência."
    }, authHeaders(error));
  }
};

async function deleteSelection(req, res, session) {
  const { selectionId } = await readJson(req);
  if (!isUuid(selectionId)) {
    return sendJson(res, 400, { error: "Referência inválida." }, authHeaders(session));
  }

  const result = await query(
    `delete from client_pinterest_selections
     where id = $1 and client_id = $2
     returning id`,
    [selectionId, session.clientId]
  );
  if (!result.rows[0]) {
    return sendJson(res, 404, { error: "Referência não encontrada." }, authHeaders(session));
  }
  return sendJson(res, 200, { ok: true }, authHeaders(session));
}

function isUuid(value) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(String(value || ""));
}
