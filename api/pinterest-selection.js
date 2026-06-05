const { query } = require("./_lib/db");
const { sendJson, readJson, methodNotAllowed } = require("./_lib/http");
const { requireRole } = require("./_lib/security");

module.exports = async function handler(req, res) {
  if (req.method !== "POST") return methodNotAllowed(res);

  try {
    const session = requireRole(req, ["client"]);
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

    return sendJson(res, 201, { selection: result.rows[0] });
  } catch (error) {
    return sendJson(res, error.code === "UNAUTHORIZED" ? 401 : 500, {
      error: error.message || "Erro ao salvar referência."
    });
  }
};
