const { Pool } = require("pg");

let pool;

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
      ssl: connectionString.includes("localhost") ? false : { rejectUnauthorized: true }
    });
  }

  return pool;
}

async function query(text, params = []) {
  return getPool().query(text, params);
}

module.exports = { query };
