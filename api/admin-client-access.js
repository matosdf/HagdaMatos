const { query, transaction } = require("./_lib/db");
const { sendJson, readJson, methodNotAllowed, requireSameOrigin } = require("./_lib/http");
const { authHeaders, requireRole } = require("./_lib/security");
const { deleteAuthUser, inviteUserByEmail, setUserAccess } = require("./_lib/supabase-auth");

module.exports = async function handler(req, res) {
  if (req.method !== "POST") return methodNotAllowed(res);

  try {
    requireSameOrigin(req);
    const session = await requireRole(req, ["owner"]);
    const { clientId, action } = await readJson(req);
    if (!isUuid(clientId) || !["invite", "activate", "deactivate"].includes(action)) {
      return sendJson(res, 400, { error: "Solicitação inválida." }, authHeaders(session));
    }

    const result = await query(
      `select c.id, c.email, c.is_active, p.auth_user_id, p.is_active as access_active
       from clients c
       left join profiles p on p.client_id = c.id and p.role = 'client'
       where c.id = $1
       limit 1`,
      [clientId]
    );
    const client = result.rows[0];
    if (!client) return sendJson(res, 404, { error: "Cliente não encontrada." }, authHeaders(session));

    if (action === "invite") {
      if (client.auth_user_id) {
        return sendJson(res, 409, { error: "Esta cliente já possui acesso cadastrado." }, authHeaders(session));
      }
      const protocol = req.headers["x-forwarded-proto"] || "https";
      const host = req.headers["x-forwarded-host"] || req.headers.host;
      const invitedUser = await inviteUserByEmail(client.email, `${protocol}://${host}/redefinir-senha.html`);
      try {
        await query(
          `insert into profiles (auth_user_id, role, client_id, is_active)
           values ($1, 'client', $2, true)`,
          [invitedUser.id, client.id]
        );
      } catch (error) {
        await deleteAuthUser(invitedUser.id);
        throw error;
      }
      return sendJson(res, 200, { ok: true, message: "Convite enviado para a cliente." }, authHeaders(session));
    }

    if (!client.auth_user_id) {
      return sendJson(res, 409, { error: "Esta cliente ainda não possui acesso cadastrado." }, authHeaders(session));
    }

    const active = action === "activate";
    await setUserAccess(client.auth_user_id, active);
    await transaction(async db => {
      await db.query("update profiles set is_active = $2, updated_at = now() where auth_user_id = $1", [
        client.auth_user_id,
        active
      ]);
      await db.query("update clients set is_active = $2, updated_at = now() where id = $1", [client.id, active]);
    });

    return sendJson(res, 200, {
      ok: true,
      message: active ? "Acesso reativado." : "Acesso desativado."
    }, authHeaders(session));
  } catch (error) {
    const status = error.code === "UNAUTHORIZED" ? 401 :
      error.code === "INVALID_ORIGIN" ? 403 :
      ["AUTH_USER_EXISTS"].includes(error.code) ? 409 :
      ["AUTH_ADMIN_NOT_CONFIGURED"].includes(error.code) ? 503 : 500;
    const messages = {
      AUTH_USER_EXISTS: "Já existe uma conta Auth com esse e-mail. Associe-a manualmente antes de convidar.",
      AUTH_ADMIN_NOT_CONFIGURED: "Convites ainda não estão configurados na Vercel."
    };
    return sendJson(res, status, {
      error: messages[error.code] || (status === 401 ? "Acesso não autorizado." : "Erro ao alterar acesso da cliente.")
    }, authHeaders(error));
  }
};

function isUuid(value) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(String(value || ""));
}
