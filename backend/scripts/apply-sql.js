const fs = require('node:fs');
const path = require('node:path');
const { Client } = require('pg');
const { loadBackendEnv } = require('./load-env');

loadBackendEnv();

const DB_HOST = process.env.DB_HOST || 'localhost';
const DB_PORT = Number(process.env.DB_PORT || 5432);
const DB_USER = process.env.DB_USER || 'postgres';
const DB_PASSWORD = process.env.DB_PASSWORD || '34343434';
const DB_NAME = process.env.DB_NAME || 'Sistema de gestión de reservas y experiencia del cliente';
const DATABASE_URL = process.env.DATABASE_URL;
const DATABASE_DIR = path.resolve(__dirname, '../database');
const SQL_FILES = process.argv[2]
  ? [path.resolve(process.argv[2])]
  : fs
      .readdirSync(DATABASE_DIR)
      .filter((file) => /^\d+_.+\.sql$/u.test(file))
      .sort((left, right) => {
        const leftPrefix = Number(left.match(/^\d+/u)?.[0] ?? Number.POSITIVE_INFINITY);
        const rightPrefix = Number(right.match(/^\d+/u)?.[0] ?? Number.POSITIVE_INFINITY);

        return leftPrefix === rightPrefix
          ? left.localeCompare(right, 'en')
          : leftPrefix - rightPrefix;
      })
      .map((file) => path.join(DATABASE_DIR, file));

function quoteIdent(value) {
  return `"${String(value).replace(/"/g, '""')}"`;
}

async function ensureDatabaseExists() {
  const adminClient = new Client({
    connectionString: DATABASE_URL,
    host: DATABASE_URL ? undefined : DB_HOST,
    port: DATABASE_URL ? undefined : DB_PORT,
    user: DATABASE_URL ? undefined : DB_USER,
    password: DATABASE_URL ? undefined : DB_PASSWORD,
    database: DATABASE_URL ? undefined : 'postgres',
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
  const client = new Client({
    connectionString: DATABASE_URL,
    host: DATABASE_URL ? undefined : DB_HOST,
    port: DATABASE_URL ? undefined : DB_PORT,
    user: DATABASE_URL ? undefined : DB_USER,
    password: DATABASE_URL ? undefined : DB_PASSWORD,
    database: DATABASE_URL ? undefined : DB_NAME,
  });

  await client.connect();
  try {
    for (const sqlFile of SQL_FILES) {
      const sql = fs.readFileSync(sqlFile, 'utf8');
      await client.query('BEGIN');
      try {
        await client.query(sql);
        await client.query('COMMIT');
      } catch (error) {
        await client.query('ROLLBACK').catch(() => {});
        throw error;
      }
    }
  } finally {
    await client.end();
  }
}

async function main() {
  await ensureDatabaseExists();
  await applySchema();
  process.stdout.write(`Applied schema from ${SQL_FILES.join(', ')} to ${DB_NAME}\n`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
