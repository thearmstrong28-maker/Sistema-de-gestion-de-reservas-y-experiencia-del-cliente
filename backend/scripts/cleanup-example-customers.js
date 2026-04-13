const { Client } = require('pg');
const { loadBackendEnv } = require('./load-env');

loadBackendEnv();

const DB_HOST = process.env.DB_HOST || 'localhost';
const DB_PORT = Number(process.env.DB_PORT || 5432);
const DB_USER = process.env.DB_USER || 'postgres';
const DB_PASSWORD = process.env.DB_PASSWORD || 'postgres';
const DB_NAME = process.env.DB_NAME || 'restaurant_reservations';
const DATABASE_URL = process.env.DATABASE_URL;

const CUSTOMER_NAME_PATTERNS = [
  'Cliente con dependencias%',
  'Cliente sin dependencias%',
];

const CUSTOMER_EMAIL_PATTERNS = [
  'delete-customer%',
  'delete-customer-deps%',
];

function makeClient() {
  return new Client({
    connectionString: DATABASE_URL,
    host: DATABASE_URL ? undefined : DB_HOST,
    port: DATABASE_URL ? undefined : DB_PORT,
    user: DATABASE_URL ? undefined : DB_USER,
    password: DATABASE_URL ? undefined : DB_PASSWORD,
    database: DATABASE_URL ? undefined : DB_NAME,
  });
}

async function main() {
  const client = makeClient();
  await client.connect();

  try {
    await client.query('BEGIN');

    const customers = await client.query(
      `
        SELECT id
        FROM customers
        WHERE (${CUSTOMER_NAME_PATTERNS.map((_, index) => `full_name LIKE $${index + 1}`).join(' OR ')})
           OR (${CUSTOMER_EMAIL_PATTERNS.map((_, index) => `email LIKE $${CUSTOMER_NAME_PATTERNS.length + index + 1}`).join(' OR ')})
      `,
      [...CUSTOMER_NAME_PATTERNS, ...CUSTOMER_EMAIL_PATTERNS],
    );

    const customerIds = customers.rows.map((row) => row.id);

    if (customerIds.length === 0) {
      await client.query('COMMIT');
      process.stdout.write('No example customers found.\n');
      return;
    }

    await client.query('ALTER TABLE reservations DISABLE TRIGGER ALL');
    await client.query('ALTER TABLE waitlist_entries DISABLE TRIGGER ALL');

    const reservationsResult = await client.query(
      'DELETE FROM reservations WHERE customer_id = ANY($1::uuid[])',
      [customerIds],
    );
    const waitlistResult = await client.query(
      'DELETE FROM waitlist_entries WHERE customer_id = ANY($1::uuid[])',
      [customerIds],
    );
    const customersResult = await client.query(
      'DELETE FROM customers WHERE id = ANY($1::uuid[])',
      [customerIds],
    );

    await client.query('ALTER TABLE waitlist_entries ENABLE TRIGGER ALL');
    await client.query('ALTER TABLE reservations ENABLE TRIGGER ALL');

    await client.query('COMMIT');

    process.stdout.write(
      `Removed ${customersResult.rowCount} customers, ${reservationsResult.rowCount} reservations and ${waitlistResult.rowCount} waitlist entries.\n`,
    );
  } catch (error) {
    await client.query('ROLLBACK').catch(() => {});
    throw error;
  } finally {
    await client.end();
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
