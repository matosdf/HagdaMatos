const { query } = require("./_lib/db");
const { sendJson, methodNotAllowed } = require("./_lib/http");
const { requireRole } = require("./_lib/security");

module.exports = async function handler(req, res) {
  if (req.method !== "GET") return methodNotAllowed(res);

  try {
    const session = requireRole(req, ["client", "owner"]);
    let client = null;

    if (session.clientId) {
      const result = await query(
        "select id, full_name, email from clients where id = $1",
        [session.clientId]
      );
      client = result.rows[0] || null;
    }

    return sendJson(res, 200, {
      user: {
        email: session.email,
        role: session.role,
        client
      }
    });
  } catch (error) {
    return sendJson(res, error.code === "UNAUTHORIZED" ? 401 : 500, {
      error: error.message || "Erro ao consultar sessão."
    });
  }
};
