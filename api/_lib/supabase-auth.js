const REFRESH_MAX_AGE_SECONDS = 60 * 60 * 24 * 30;

function getAuthConfig() {
  const rawUrl = String(process.env.SUPABASE_URL || "").replace(/\/+$/, "");
  const publishableKey = process.env.SUPABASE_PUBLISHABLE_KEY || process.env.SUPABASE_ANON_KEY;
  if (!rawUrl || !publishableKey) {
    const error = new Error("Supabase Auth não configurado.");
    error.code = "AUTH_NOT_CONFIGURED";
    throw error;
  }

  let url;
  try {
    url = new URL(rawUrl);
  } catch (_error) {
    const error = new Error("URL do Supabase Auth inválida.");
    error.code = "AUTH_URL_INVALID";
    throw error;
  }
  if (url.protocol !== "https:" && url.hostname !== "localhost") {
    const error = new Error("URL do Supabase Auth precisa usar HTTPS.");
    error.code = "AUTH_URL_INVALID";
    throw error;
  }
  return { url: url.origin, publishableKey };
}

function getAdminAuthConfig() {
  const config = getAuthConfig();
  const secretKey = process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!secretKey) {
    const error = new Error("Administração do Supabase Auth não configurada.");
    error.code = "AUTH_ADMIN_NOT_CONFIGURED";
    throw error;
  }
  return { ...config, secretKey };
}

function getCookieNames() {
  const prefix = process.env.NODE_ENV === "production" ? "__Host-" : "";
  return {
    access: `${prefix}hm_access`,
    refresh: `${prefix}hm_refresh`
  };
}

function parseCookies(req) {
  return Object.fromEntries(
    (req.headers.cookie || "")
      .split(";")
      .map(cookie => cookie.trim())
      .filter(Boolean)
      .map(cookie => {
        const index = cookie.indexOf("=");
        return [cookie.slice(0, index), decodeURIComponent(cookie.slice(index + 1))];
      })
  );
}

function cookie(name, value, maxAge) {
  const secure = process.env.NODE_ENV === "production" ? " Secure;" : "";
  return `${name}=${encodeURIComponent(value)}; HttpOnly;${secure} SameSite=Strict; Path=/; Max-Age=${maxAge}; Priority=High`;
}

function createAuthCookies(session) {
  const names = getCookieNames();
  return [
    cookie(names.access, session.access_token, Math.max(60, session.expires_in || 3600)),
    cookie(names.refresh, session.refresh_token, REFRESH_MAX_AGE_SECONDS)
  ];
}

function clearAuthCookies() {
  const names = getCookieNames();
  return [
    cookie(names.access, "", 0),
    cookie(names.refresh, "", 0),
    cookie("hm_session", "", 0)
  ];
}

async function authRequest(path, options = {}) {
  const { url, publishableKey } = getAuthConfig();
  return fetch(`${url}/auth/v1${path}`, {
    ...options,
    headers: {
      apikey: publishableKey,
      "Content-Type": "application/json",
      ...options.headers
    }
  });
}

async function adminAuthRequest(path, options = {}) {
  const { url, secretKey } = getAdminAuthConfig();
  return fetch(`${url}/auth/v1${path}`, {
    ...options,
    headers: {
      apikey: secretKey,
      Authorization: `Bearer ${secretKey}`,
      "Content-Type": "application/json",
      ...options.headers
    }
  });
}

async function signInWithPassword(email, password) {
  const response = await authRequest("/token?grant_type=password", {
    method: "POST",
    body: JSON.stringify({ email, password })
  });
  if (!response.ok) return null;
  return response.json();
}

async function getAuthenticatedUser(req) {
  const cookies = parseCookies(req);
  const names = getCookieNames();
  const accessToken = cookies[names.access];
  const refreshToken = cookies[names.refresh];
  if (!accessToken) return { user: null, refreshToken };

  const response = await authRequest("/user", {
    headers: { Authorization: `Bearer ${accessToken}` }
  });
  if (!response.ok) return { user: null, refreshToken };
  return { user: await response.json(), refreshToken };
}

async function refreshAuthenticatedUser(refreshToken) {
  if (!refreshToken) return { user: null };
  const response = await authRequest("/token?grant_type=refresh_token", {
    method: "POST",
    body: JSON.stringify({ refresh_token: refreshToken })
  });
  if (!response.ok) return { user: null };

  const session = await response.json();
  return {
    user: session.user,
    cookies: createAuthCookies(session)
  };
}

async function signOut(req) {
  const cookies = parseCookies(req);
  const names = getCookieNames();
  const accessToken = cookies[names.access];

  if (accessToken) {
    const response = await revokeSessions(accessToken);
    if (response.ok) return;
  }

  if (cookies[names.refresh]) {
    const refreshed = await refreshAuthenticatedUser(cookies[names.refresh]);
    const refreshedAccess = refreshed.user ? parseAccessToken(refreshed.cookies, names.access) : null;
    if (refreshedAccess) await revokeSessions(refreshedAccess);
  }
}

function revokeSessions(accessToken) {
  return authRequest("/logout?scope=global", {
    method: "POST",
    headers: { Authorization: `Bearer ${accessToken}` }
  });
}

function parseAccessToken(cookies, accessCookieName) {
  const prefix = `${accessCookieName}=`;
  const accessCookie = cookies?.find(value => value.startsWith(prefix));
  if (!accessCookie) return null;
  return decodeURIComponent(accessCookie.slice(prefix.length).split(";")[0]);
}

async function requestPasswordReset(email, redirectTo) {
  const response = await authRequest("/recover", {
    method: "POST",
    body: JSON.stringify({ email, redirect_to: redirectTo })
  });
  return response.ok;
}

async function updatePassword(accessToken, password) {
  const response = await authRequest("/user", {
    method: "PUT",
    headers: { Authorization: `Bearer ${accessToken}` },
    body: JSON.stringify({ password })
  });
  return response.ok;
}

async function inviteUserByEmail(email, redirectTo) {
  const response = await adminAuthRequest("/invite", {
    method: "POST",
    body: JSON.stringify({
      email,
      redirect_to: redirectTo
    })
  });
  const payload = await response.json();
  if (!response.ok) {
    const error = new Error(payload.message || payload.msg || "Não foi possível enviar o convite.");
    error.code = response.status === 422 ? "AUTH_USER_EXISTS" : "AUTH_INVITE_FAILED";
    throw error;
  }
  const user = payload.user || payload;
  if (!user?.id) {
    const error = new Error("Resposta inválida ao enviar convite.");
    error.code = "AUTH_INVITE_FAILED";
    throw error;
  }
  return user;
}

async function setUserAccess(authUserId, active) {
  const response = await adminAuthRequest(`/admin/users/${encodeURIComponent(authUserId)}`, {
    method: "PUT",
    body: JSON.stringify({ ban_duration: active ? "none" : "876000h" })
  });
  if (!response.ok) {
    const payload = await response.json();
    const error = new Error(payload.message || payload.msg || "Não foi possível alterar o acesso.");
    error.code = "AUTH_ACCESS_UPDATE_FAILED";
    throw error;
  }
  return response.json();
}

async function deleteAuthUser(authUserId) {
  const response = await adminAuthRequest(`/admin/users/${encodeURIComponent(authUserId)}`, {
    method: "DELETE"
  });
  return response.ok;
}

module.exports = {
  clearAuthCookies,
  createAuthCookies,
  deleteAuthUser,
  getAuthenticatedUser,
  inviteUserByEmail,
  requestPasswordReset,
  refreshAuthenticatedUser,
  signInWithPassword,
  signOut,
  setUserAccess,
  updatePassword
};
