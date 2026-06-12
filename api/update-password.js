const { sendJson, readJson, methodNotAllowed, requireSameOrigin } = require("./_lib/http");
const { clearAuthCookies, updatePassword } = require("./_lib/supabase-auth");

module.exports = async function handler(req, res) {
  if (req.method !== "POST") return methodNotAllowed(res);

  try {
    requireSameOrigin(req);
    const { accessToken, password } = await readJson(req);
    if (!accessToken || String(password || "").length < 12) {
      return sendJson(res, 400, { error: "Use uma senha com pelo menos 12 caracteres." });
    }

    const updated = await updatePassword(accessToken, password);
    if (!updated) return sendJson(res, 401, { error: "Link inválido ou expirado." });

    return sendJson(res, 200, { ok: true }, { "Set-Cookie": clearAuthCookies() });
  } catch (error) {
    const status = error.code === "INVALID_ORIGIN" ? 403 : 500;
    return sendJson(res, status, { error: "Não foi possível atualizar a senha." });
  }
};
