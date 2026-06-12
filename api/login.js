const { query } = require("./_lib/db");
const { sendJson, readJson, methodNotAllowed, requireSameOrigin } = require("./_lib/http");
const { clearAuthCookies, createAuthCookies, signInWithPassword } = require("./_lib/supabase-auth");

module.exports = async function handler(req, res) {
  if (req.method !== "POST") return methodNotAllowed(res);

  try {
    requireSameOrigin(req);
    const { email, password } = await readJson(req);
    const normalizedEmail = String(email || "").trim().toLowerCase();

    if (!normalizedEmail || !password) {
      return sendJson(res, 400, { error: "Informe e-mail e senha." });
    }

    const session = await signInWithPassword(normalizedEmail, password);
    if (!session?.user) {
      return sendJson(res, 401, { error: "Credenciais inválidas." });
    }

    const result = await query(
      "select role from profiles where auth_user_id = $1 limit 1",
      [session.user.id]
    );
    const profile = result.rows[0];
    if (!profile) {
      return sendJson(res, 403, { error: "Acesso ainda não liberado." }, {
        "Set-Cookie": clearAuthCookies()
      });
    }

    const redirectTo = profile.role === "owner" ? "/proprietaria.html" : "/cliente.html";

    return sendJson(res, 200, { ok: true, role: profile.role, redirectTo }, {
      "Set-Cookie": createAuthCookies(session)
    });
  } catch (error) {
    console.error("Falha ao autenticar:", error);
    const configurationErrors = [
      "DB_NOT_CONFIGURED",
      "DB_CA_NOT_CONFIGURED",
      "DB_CA_INVALID",
      "DB_URL_INVALID",
      "DB_SSL_OPTIONS_CONFLICT",
      "AUTH_NOT_CONFIGURED",
      "AUTH_URL_INVALID"
    ];
    const status = error.code === "INVALID_ORIGIN" ? 403 : configurationErrors.includes(error.code) ? 503 : 500;
    const message = status === 503
      ? "Serviço temporariamente indisponível."
      : "Erro ao autenticar. Tente novamente.";
    return sendJson(res, status, { error: message });
  }
};
