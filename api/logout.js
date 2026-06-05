const { sendJson, methodNotAllowed } = require("./_lib/http");
const { clearSessionCookie } = require("./_lib/security");

module.exports = async function handler(req, res) {
  if (req.method !== "POST") return methodNotAllowed(res);
  return sendJson(res, 200, { ok: true }, { "Set-Cookie": clearSessionCookie() });
};
