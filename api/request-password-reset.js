const { sendJson, readJson, methodNotAllowed, requireSameOrigin } = require("./_lib/http");
const { requestPasswordReset } = require("./_lib/supabase-auth");

module.exports = async function handler(req, res) {
  if (req.method !== "POST") return methodNotAllowed(res);

  try {
    requireSameOrigin(req);
    const { email } = await readJson(req);
    const normalizedEmail = String(email || "").trim().toLowerCase();
    if (!normalizedEmail) return sendJson(res, 400, { error: "Informe seu e-mail." });

    const protocol = req.headers["x-forwarded-proto"] || "https";
    const host = req.headers["x-forwarded-host"] || req.headers.host;
    await requestPasswordReset(normalizedEmail, `${protocol}://${host}/redefinir-senha.html`);

    return sendJson(res, 200, {
      ok: true,
      message: "Se o e-mail estiver cadastrado, enviaremos as instruções."
    });
  } catch (error) {
    const status = error.code === "INVALID_ORIGIN" ? 403 : 500;
    return sendJson(res, status, {
      error: status === 403 ? "Origem não autorizada." : "Não foi possível solicitar a recuperação."
    });
  }
};
