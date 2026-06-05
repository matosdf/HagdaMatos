const { query } = require("./_lib/db");
const { sendJson, readJson, methodNotAllowed } = require("./_lib/http");
const { createSessionCookie, verifyPassword } = require("./_lib/security");

module.exports = async function handler(req, res) {
  if (req.method !== "POST") return methodNotAllowed(res);

  try {
    const { email, password } = await readJson(req);
    const normalizedEmail = String(email || "").trim().toLowerCase();

    if (!normalizedEmail || !password) {
      return sendJson(res, 400, { error: "Informe e-mail e senha." });
    }

    const result = await query(
      "select id, email, password_hash, password_salt, role, client_id from app_users where lower(email) = $1 limit 1",
      [normalizedEmail]
    );
    const user = result.rows[0];

    if (!user || !(await verifyPassword(password, user.password_salt, user.password_hash))) {
      return sendJson(res, 401, { error: "Credenciais inválidas." });
    }

    await query("update app_users set last_login_at = now() where id = $1", [user.id]);

    const redirectTo = user.role === "owner" ? "/proprietaria.html" : "/cliente.html";
    const cookie = createSessionCookie({
      userId: user.id,
      email: user.email,
      role: user.role,
      clientId: user.client_id
    });

    return sendJson(res, 200, { ok: true, role: user.role, redirectTo }, {
      "Set-Cookie": cookie
    });
  } catch (error) {
    const status = error.code === "DB_NOT_CONFIGURED" || error.code === "SESSION_SECRET_INVALID" ? 503 : 500;
    return sendJson(res, status, { error: error.message || "Erro ao autenticar." });
  }
};
