function sendJson(res, status, body, headers = {}) {
  res.writeHead(status, {
    "Content-Type": "application/json; charset=utf-8",
    ...headers
  });
  res.end(JSON.stringify(body));
}

function readJson(req) {
  return new Promise((resolve, reject) => {
    let raw = "";
    req.on("data", chunk => {
      raw += chunk;
      if (raw.length > 1024 * 32) {
        reject(new Error("Payload muito grande."));
        req.destroy();
      }
    });
    req.on("end", () => {
      try {
        resolve(raw ? JSON.parse(raw) : {});
      } catch (error) {
        reject(error);
      }
    });
    req.on("error", reject);
  });
}

function methodNotAllowed(res) {
  sendJson(res, 405, { error: "Método não permitido." });
}

function requireSameOrigin(req) {
  const origin = req.headers.origin;
  const host = req.headers["x-forwarded-host"] || req.headers.host;
  if (!origin || !host) {
    const error = new Error("Origem não autorizada.");
    error.code = "INVALID_ORIGIN";
    throw error;
  }

  let originUrl;
  try {
    originUrl = new URL(origin);
  } catch (_error) {
    const error = new Error("Origem não autorizada.");
    error.code = "INVALID_ORIGIN";
    throw error;
  }
  if (originUrl.host !== host || !["https:", "http:"].includes(originUrl.protocol)) {
    const error = new Error("Origem não autorizada.");
    error.code = "INVALID_ORIGIN";
    throw error;
  }
}

module.exports = { sendJson, readJson, methodNotAllowed, requireSameOrigin };
