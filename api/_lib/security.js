const { query } = require("./db");
const {
  clearAuthCookies,
  getAuthenticatedUser,
  refreshAuthenticatedUser
} = require("./supabase-auth");

async function requireRole(req, roles) {
  let auth = await getAuthenticatedUser(req);
  const responseCookies = [];

  if (!auth.user && auth.refreshToken) {
    auth = await refreshAuthenticatedUser(auth.refreshToken);
    if (auth.cookies) responseCookies.push(...auth.cookies);
  }

  if (!auth.user) {
    const error = new Error("Acesso não autorizado.");
    error.code = "UNAUTHORIZED";
    error.cookies = clearAuthCookies();
    throw error;
  }

  const result = await query(
    `select auth_user_id, role, client_id
     from profiles
     where auth_user_id = $1
     limit 1`,
    [auth.user.id]
  );
  const profile = result.rows[0];

  if (!profile || !roles.includes(profile.role)) {
    const error = new Error("Acesso não autorizado.");
    error.code = "UNAUTHORIZED";
    error.cookies = clearAuthCookies();
    throw error;
  }

  return {
    userId: auth.user.id,
    email: auth.user.email,
    role: profile.role,
    clientId: profile.client_id,
    responseCookies
  };
}

function authHeaders(value) {
  const cookies = value?.responseCookies || value?.cookies;
  return cookies?.length ? { "Set-Cookie": cookies } : {};
}

module.exports = { authHeaders, requireRole };
