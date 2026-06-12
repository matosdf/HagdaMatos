const { Pool } = require("pg");

let pool;

function getSslConfig(connectionString) {
  if (connectionString.includes("localhost") || connectionString.includes("127.0.0.1")) {
    return false;
  }

  const encodedCa = process.env.SUPABASE_DB_CA_BASE64;
  if (!encodedCa) {
    const error = new Error("Certificado raiz do banco não configurado.");
    error.code = "DB_CA_NOT_CONFIGURED";
    throw error;
  }

  const ca = Buffer.from(encodedCa, "base64").toString("utf8");
  if (!ca.includes("-----BEGIN CERTIFICATE-----")) {
    const error = new Error("Certificado raiz do banco inválido.");
    error.code = "DB_CA_INVALID";
    throw error;
  }

  return {
    ca,
    rejectUnauthorized: true
  };
}

function getPool() {
  const connectionString = process.env.POSTGRES_URL || process.env.DATABASE_URL;

  if (!connectionString) {
    const error = new Error("Banco de dados não configurado. Defina POSTGRES_URL ou DATABASE_URL na Vercel.");
    error.code = "DB_NOT_CONFIGURED";
    throw error;
  }

  if (!pool) {
    pool = new Pool({
      connectionString,
      ssl: getSslConfig(connectionString)
    });
  }

  return pool;
}

async function query(text, params = []) {
  return getPool().query(text, params);
}

module.exports = { query };
