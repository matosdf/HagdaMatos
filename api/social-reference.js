const { query } = require("./_lib/db");
const { sendJson, readJson, methodNotAllowed, requireSameOrigin } = require("./_lib/http");
const { authHeaders, requireRole } = require("./_lib/security");

module.exports = async function handler(req, res) {
  if (!["POST", "DELETE"].includes(req.method)) return methodNotAllowed(res);

  try {
    requireSameOrigin(req);
    const session = await requireRole(req, ["client"]);
    if (req.method === "DELETE") return deleteReference(req, res, session);

    const { socialUrl, network, notes } = await readJson(req);
    const url = String(socialUrl || "").trim();
    const normalizedNetwork = String(network || "").trim().toLowerCase();
    const normalizedNotes = String(notes || "").trim() || null;
    const detectedNetwork = detectNetwork(url);

    if (!["instagram", "linkedin"].includes(normalizedNetwork)) {
      return sendJson(res, 400, { error: "Escolha Instagram ou LinkedIn." });
    }
    if (!detectedNetwork || detectedNetwork !== normalizedNetwork) {
      return sendJson(res, 400, { error: `Informe um link válido do ${networkLabel(normalizedNetwork)}.` });
    }
    if (url.length > 2048) return sendJson(res, 400, { error: "O link informado é muito longo." });
    if (normalizedNotes?.length > 2000) return sendJson(res, 400, { error: "A observação deve ter no máximo 2.000 caracteres." });

    const result = await query(
      `insert into client_social_references (client_id, network, social_url, notes)
       values ($1, $2, $3, $4)
       returning id, network, social_url, notes, created_at`,
      [session.clientId, normalizedNetwork, url, normalizedNotes]
    );

    return sendJson(res, 201, { reference: result.rows[0] }, authHeaders(session));
  } catch (error) {
    const status = error.code === "UNAUTHORIZED" ? 401 : error.code === "INVALID_ORIGIN" ? 403 : 500;
    return sendJson(res, status, {
      error: error.code === "UNAUTHORIZED" ? "Acesso não autorizado." : "Erro ao salvar referência."
    }, authHeaders(error));
  }
};

async function deleteReference(req, res, session) {
  const { referenceId } = await readJson(req);
  if (!isUuid(referenceId)) {
    return sendJson(res, 400, { error: "Referência inválida." }, authHeaders(session));
  }

  const result = await query(
    `delete from client_social_references
     where id = $1 and client_id = $2
     returning id`,
    [referenceId, session.clientId]
  );
  if (!result.rows[0]) {
    return sendJson(res, 404, { error: "Referência não encontrada." }, authHeaders(session));
  }
  return sendJson(res, 200, { ok: true }, authHeaders(session));
}

function detectNetwork(value) {
  let url;
  try {
    url = new URL(value);
  } catch (_error) {
    return null;
  }
  if (url.protocol !== "https:") return null;
  const host = url.hostname.toLowerCase();
  if (host === "instagram.com" || host.endsWith(".instagram.com")) return "instagram";
  if (host === "linkedin.com" || host.endsWith(".linkedin.com")) return "linkedin";
  return null;
}

function networkLabel(network) {
  return network === "linkedin" ? "LinkedIn" : "Instagram";
}

function isUuid(value) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(String(value || ""));
}
