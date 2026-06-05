const crypto = require("crypto");

const COOKIE_NAME = "hm_session";
const SESSION_MAX_AGE_SECONDS = 60 * 60 * 8;
const SCRYPT_KEY_LENGTH = 64;

function getSessionSecret() {
  const secret = process.env.SESSION_SECRET;
  if (!secret || secret.length < 32) {
    const error = new Error("SESSION_SECRET precisa ter pelo menos 32 caracteres.");
    error.code = "SESSION_SECRET_INVALID";
    throw error;
  }
  return secret;
}

function base64Url(input) {
  return Buffer.from(input).toString("base64url");
}

function sign(value) {
  return crypto
    .createHmac("sha256", getSessionSecret())
    .update(value)
    .digest("base64url");
}

function createSessionCookie(payload) {
  const sessionPayload = {
    ...payload,
    exp: Math.floor(Date.now() / 1000) + SESSION_MAX_AGE_SECONDS
  };
  const encoded = base64Url(JSON.stringify(sessionPayload));
  const signature = sign(encoded);
  const secure = process.env.NODE_ENV === "production" ? " Secure;" : "";

  return `${COOKIE_NAME}=${encoded}.${signature}; HttpOnly;${secure} SameSite=Lax; Path=/; Max-Age=${SESSION_MAX_AGE_SECONDS}`;
}

function clearSessionCookie() {
  return `${COOKIE_NAME}=; HttpOnly; SameSite=Lax; Path=/; Max-Age=0`;
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

function getSession(req) {
  try {
    const token = parseCookies(req)[COOKIE_NAME];
    if (!token) return null;

    const [encoded, signature] = token.split(".");
    if (!encoded || !signature) return null;

    const expected = sign(encoded);
    const signatureBuffer = Buffer.from(signature);
    const expectedBuffer = Buffer.from(expected);
    if (signatureBuffer.length !== expectedBuffer.length) return null;

    const validSignature = crypto.timingSafeEqual(signatureBuffer, expectedBuffer);
    if (!validSignature) return null;

    const payload = JSON.parse(Buffer.from(encoded, "base64url").toString("utf8"));
    if (!payload.exp || payload.exp < Math.floor(Date.now() / 1000)) return null;
    return payload;
  } catch (_error) {
    return null;
  }
}

function requireRole(req, roles) {
  const session = getSession(req);
  if (!session || !roles.includes(session.role)) {
    const error = new Error("Acesso não autorizado.");
    error.code = "UNAUTHORIZED";
    throw error;
  }
  return session;
}

function hashPassword(password, salt = crypto.randomBytes(16).toString("base64url")) {
  return new Promise((resolve, reject) => {
    crypto.scrypt(password, salt, SCRYPT_KEY_LENGTH, (error, derivedKey) => {
      if (error) return reject(error);
      resolve({
        salt,
        hash: derivedKey.toString("base64url")
      });
    });
  });
}

async function verifyPassword(password, salt, storedHash) {
  const { hash } = await hashPassword(password, salt);
  const hashBuffer = Buffer.from(hash);
  const storedBuffer = Buffer.from(storedHash);
  if (hashBuffer.length !== storedBuffer.length) return false;
  return crypto.timingSafeEqual(hashBuffer, storedBuffer);
}

module.exports = {
  createSessionCookie,
  clearSessionCookie,
  getSession,
  hashPassword,
  requireRole,
  verifyPassword
};
