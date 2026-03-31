const fs = require('node:fs');
const path = require('node:path');
const { Client } = require('pg');

const DB_HOST = process.env.DB_HOST || 'localhost';
const DB_PORT = Number(process.env.DB_PORT || 5432);
const DB_USER = process.env.DB_USER || 'postgres';
const DB_PASSWORD = process.env.DB_PASSWORD || '34343434';
const DB_NAME = process.env.DB_NAME || 'Sistema de gestión de reservas y experiencia del cliente';
const SQL_FILE = process.argv[2]
  ? path.resolve(process.argv[2])
  : path.resolve(__dirname, '../database/001_initial_schema.sql');

function quoteIdent(value) {
  return `"${String(value).replace(/"/g, '""')}"`;
}

async function ensureDatabaseExists() {
  const adminClient = new Client({
    host: DB_HOST,
    port: DB_PORT,
    user: DB_USER,
    password: DB_PASSWORD,
    database: 'postgres',
  });

  await adminClient.connect();

  try {
    const exists = await adminClient.query('SELECT 1 FROM pg_database WHERE datname = $1', [DB_NAME]);

    if (exists.rowCount === 0) {
      await adminClient.query(`CREATE DATABASE ${quoteIdent(DB_NAME)}`);
    }
  } finally {
    await adminClient.end();
  }
}

async function applySchema() {
  const sql = fs.readFileSync(SQL_FILE, 'utf8');
  const client = new Client({
    host: DB_HOST,
    port: DB_PORT,
    user: DB_USER,
    password: DB_PASSWORD,
    database: DB_NAME,
  });

  await client.connect();
  let committed = false;
  try {
    await client.query('BEGIN');
    await client.query(sql);
    await client.query('COMMIT');
    committed = true;
  } finally {
    if (!committed) {
      await client.query('ROLLBACK').catch(() => {});
    }
    await client.end();
  }
}

async function main() {
  await ensureDatabaseExists();
  await applySchema();
  process.stdout.write(`Applied schema from ${SQL_FILE} to ${DB_NAME}\n`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
