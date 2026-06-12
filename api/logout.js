const { sendJson, methodNotAllowed, requireSameOrigin } = require("./_lib/http");
const { clearAuthCookies, signOut } = require("./_lib/supabase-auth");

module.exports = async function handler(req, res) {
  if (req.method !== "POST") return methodNotAllowed(res);
  try {
    requireSameOrigin(req);
    await signOut(req);
    return sendJson(res, 200, { ok: true }, { "Set-Cookie": clearAuthCookies() });
  } catch (error) {
    return sendJson(res, error.code === "INVALID_ORIGIN" ? 403 : 500, {
      error: "Não foi possível sair."
    });
  }
};
