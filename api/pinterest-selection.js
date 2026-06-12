const { query } = require("./_lib/db");
const { sendJson, readJson, methodNotAllowed, requireSameOrigin } = require("./_lib/http");
const { authHeaders, requireRole } = require("./_lib/security");

module.exports = async function handler(req, res) {
  if (req.method !== "POST") return methodNotAllowed(res);

  try {
    requireSameOrigin(req);
    const session = await requireRole(req, ["client"]);
    const { pinUrl, title, notes } = await readJson(req);
    const url = String(pinUrl || "").trim();

    if (!url || !/^https:\/\/([a-z0-9-]+\.)?pinterest\./i.test(url)) {
      return sendJson(res, 400, { error: "Informe um link válido do Pinterest começando com https://." });
    }

    const result = await query(
      `insert into client_pinterest_selections (client_id, pin_url, title, notes)
       values ($1, $2, $3, $4)
       returning id, pin_url, title, notes, created_at`,
      [session.clientId, url, title || null, notes || null]
    );

    return sendJson(res, 201, { selection: result.rows[0] }, authHeaders(session));
  } catch (error) {
    const status = error.code === "UNAUTHORIZED" ? 401 : error.code === "INVALID_ORIGIN" ? 403 : 500;
    return sendJson(res, status, {
      error: error.code === "UNAUTHORIZED" ? "Acesso não autorizado." : "Erro ao salvar referência."
    }, authHeaders(error));
  }
};
