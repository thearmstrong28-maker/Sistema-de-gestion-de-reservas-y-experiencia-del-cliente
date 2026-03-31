const { Client } = require('pg');

const DB_HOST = process.env.DB_HOST || 'localhost';
const DB_PORT = Number(process.env.DB_PORT || 5432);
const DB_USER = process.env.DB_USER || 'postgres';
const DB_PASSWORD = process.env.DB_PASSWORD || '34343434';
const DB_NAME = process.env.DB_NAME || 'Sistema de gestión de reservas y experiencia del cliente';

const REQUIRED_ENUM_LABELS = [
  'PENDING',
  'CONFIRMED',
  'SEATED',
  'COMPLETED',
  'CANCELLED',
  'NO_SHOW',
];

const REQUIRED_OBJECTS = [
  'public.users',
  'public.customers',
  'public.restaurant_tables',
  'public.shifts',
  'public.reservations',
  'public.waitlist_entries',
  'public.audit_log',
  'public.daily_shift_occupancy',
  'public.frequent_customers',
  'public.ux_reservations_active_customer_shift',
  'public.ix_reservations_date_shift_status',
  'public.ix_reservations_table_status',
  'public.ix_reservations_customer_status',
  'public.ix_tables_capacity_active',
];

function makeClient() {
  return new Client({
    host: DB_HOST,
    port: DB_PORT,
    user: DB_USER,
    password: DB_PASSWORD,
    database: DB_NAME,
  });
}

function normalizeRows(rows, key) {
  return rows.map((row) => row[key]);
}

function asNumber(value) {
  return Number(value);
}

async function queryOne(client, text, values = []) {
  const { rows } = await client.query(text, values);
  return rows[0];
}

async function expectFailure(client, name, expected, fn) {
  const savepoint = `sp_${Date.now()}_${Math.random().toString(16).slice(2)}`.replace(/[^a-zA-Z0-9_]/g, '_');
  await client.query(`SAVEPOINT ${savepoint}`);

  try {
    await fn();
    return { name, ok: false, detail: 'statement succeeded but failure was expected' };
  } catch (error) {
    const matches = typeof expected === 'function' ? expected(error) : error.code === expected;
    return matches
      ? { name, ok: true, detail: `${error.code || 'ERROR'}: ${error.message}` }
      : { name, ok: false, detail: `${error.code || 'ERROR'}: ${error.message}` };
  } finally {
    await client.query(`ROLLBACK TO SAVEPOINT ${savepoint}`).catch(() => {});
    await client.query(`RELEASE SAVEPOINT ${savepoint}`).catch(() => {});
  }
}

async function main() {
  const client = makeClient();
  const results = [];
  let failed = false;

  await client.connect();
  try {
    await client.query('BEGIN');

    const enumRows = await client.query(
      `
        SELECT e.enumlabel
        FROM pg_type t
        JOIN pg_enum e ON e.enumtypid = t.oid
        WHERE t.typname = 'reservation_status'
        ORDER BY e.enumsortorder
      `,
    );
    const enumLabels = normalizeRows(enumRows.rows, 'enumlabel');
    if (enumLabels.length !== REQUIRED_ENUM_LABELS.length || enumLabels.some((label, index) => label !== REQUIRED_ENUM_LABELS[index])) {
      throw new Error(`reservation_status labels mismatch: expected ${REQUIRED_ENUM_LABELS.join(', ')}, got ${enumLabels.join(', ')}`);
    }
    results.push({ name: 'reservation_status enum labels', ok: true, detail: enumLabels.join(', ') });

    for (const objectName of REQUIRED_OBJECTS) {
      const row = await queryOne(client, 'SELECT to_regclass($1) IS NOT NULL AS ok', [objectName]);
      if (!row.ok) {
        throw new Error(`missing schema object: ${objectName}`);
      }
      results.push({ name: `schema object exists: ${objectName}`, ok: true, detail: 'present' });
    }

    const seedRow = await queryOne(
      client,
      `
        SELECT
          (SELECT COUNT(*) FROM users WHERE email = 'admin@local.test') AS admin_users,
          (SELECT COUNT(*) FROM shifts) AS shifts_count,
          (SELECT COUNT(*) FROM restaurant_tables) AS tables_count
      `,
    );
    if (asNumber(seedRow.admin_users) !== 1) {
      throw new Error('admin seed user missing');
    }
    if (asNumber(seedRow.shifts_count) < 3) {
      throw new Error('expected at least 3 seeded shifts');
    }
    if (asNumber(seedRow.tables_count) < 4) {
      throw new Error('expected at least 4 seeded tables');
    }
    results.push({ name: 'seed data present', ok: true, detail: 'admin user, shifts, and tables found' });

    const shiftRow = await queryOne(client, `SELECT id, shift_date FROM shifts WHERE shift_name = 'lunch'`);
    const breakfastShiftRow = await queryOne(client, `SELECT id FROM shifts WHERE shift_name = 'breakfast'`);
    const tableRow = await queryOne(client, `SELECT id, capacity FROM restaurant_tables WHERE table_number = 1`);
    const altTableRow = await queryOne(client, `SELECT id FROM restaurant_tables WHERE table_number = 2`);
    const adminUserRow = await queryOne(client, `SELECT id FROM users WHERE email = 'admin@local.test'`);
    if (!shiftRow || !breakfastShiftRow || !tableRow || !altTableRow || !adminUserRow) {
      throw new Error('required seed rows are missing');
    }

    const customerA = await queryOne(
      client,
      `
        INSERT INTO customers (full_name, email, phone)
        VALUES ('Verify Customer A', 'verify-customer-a@example.test', '+541100000001')
        RETURNING id
      `,
    );
    const customerB = await queryOne(
      client,
      `
        INSERT INTO customers (full_name, email, phone)
        VALUES ('Verify Customer B', 'verify-customer-b@example.test', '+541100000002')
        RETURNING id
      `,
    );

    const completedReservation = await queryOne(
      client,
      `
        INSERT INTO reservations (
          customer_id,
          table_id,
          shift_id,
          reservation_date,
          starts_at,
          ends_at,
          party_size,
          status,
          special_requests
        )
        VALUES ($1, $2, $3, CURRENT_DATE, CURRENT_DATE + TIME '12:30', CURRENT_DATE + TIME '13:30', 2, 'COMPLETED', 'verify completed')
        RETURNING id, starts_at
      `,
      [customerA.id, tableRow.id, shiftRow.id],
    );

    const activeReservation = await queryOne(
      client,
      `
        INSERT INTO reservations (
          customer_id,
          table_id,
          shift_id,
          reservation_date,
          starts_at,
          ends_at,
          party_size,
          status,
          special_requests
        )
        VALUES ($1, $2, $3, CURRENT_DATE, CURRENT_DATE + TIME '12:00', CURRENT_DATE + TIME '13:00', 2, 'CONFIRMED', 'verify active')
        RETURNING id
      `,
      [customerA.id, tableRow.id, shiftRow.id],
    );

    const occupancyRow = await queryOne(
      client,
      `
        SELECT occupied_tables, reserved_guests
        FROM daily_shift_occupancy
        WHERE shift_id = $1
      `,
      [shiftRow.id],
    );
    if (asNumber(occupancyRow.occupied_tables) !== 1) {
      throw new Error(`daily_shift_occupancy expected 1 occupied table, got ${occupancyRow.occupied_tables}`);
    }
    if (asNumber(occupancyRow.reserved_guests) !== 2) {
      throw new Error(`daily_shift_occupancy expected 2 reserved guests, got ${occupancyRow.reserved_guests}`);
    }
    results.push({ name: 'daily_shift_occupancy view', ok: true, detail: 'active reservations counted correctly' });

    const frequentCustomerRow = await queryOne(
      client,
      `
        SELECT visit_count, no_show_count, last_visit_at
        FROM frequent_customers
        WHERE customer_id = $1
      `,
      [customerA.id],
    );
    if (asNumber(frequentCustomerRow.visit_count) !== 1) {
      throw new Error(`frequent_customers expected 1 visit, got ${frequentCustomerRow.visit_count}`);
    }
    if (asNumber(frequentCustomerRow.no_show_count) !== 0) {
      throw new Error(`frequent_customers expected 0 no-shows, got ${frequentCustomerRow.no_show_count}`);
    }
    if (!frequentCustomerRow.last_visit_at) {
      throw new Error('frequent_customers expected last_visit_at to be set');
    }
    results.push({ name: 'frequent_customers view', ok: true, detail: 'completed reservation surfaced as a visit' });

    const uniqueFailure = await expectFailure(
      client,
      'unique active reservation per customer+shift+date',
      '23505',
      () =>
        client.query(
          `
            INSERT INTO reservations (
              customer_id,
              table_id,
              shift_id,
              reservation_date,
              starts_at,
              ends_at,
              party_size,
              status
            )
            VALUES ($1, $2, $3, CURRENT_DATE, CURRENT_DATE + TIME '12:15', CURRENT_DATE + TIME '13:15', 2, 'PENDING')
          `,
          [customerA.id, altTableRow.id, shiftRow.id],
        ),
    );
    results.push(uniqueFailure);

    const overlapFailure = await expectFailure(
      client,
      'table overbooking exclusion',
      (error) => error.code === '23P01',
      () =>
        client.query(
          `
            INSERT INTO reservations (
              customer_id,
              table_id,
              shift_id,
              reservation_date,
              starts_at,
              ends_at,
              party_size,
              status
            )
            VALUES ($1, $2, $3, CURRENT_DATE, CURRENT_DATE + TIME '12:15', CURRENT_DATE + TIME '13:15', 2, 'CONFIRMED')
          `,
          [customerB.id, tableRow.id, breakfastShiftRow.id],
        ),
    );
    results.push(overlapFailure);

    const capacityFailure = await expectFailure(
      client,
      'capacity guard',
      (error) => String(error.message).includes('exceeds table capacity'),
      () =>
        client.query(
          `
            INSERT INTO reservations (
              customer_id,
              table_id,
              shift_id,
              reservation_date,
              starts_at,
              ends_at,
              party_size,
              status
            )
            VALUES ($1, $2, $3, CURRENT_DATE, CURRENT_DATE + TIME '08:00', CURRENT_DATE + TIME '09:00', 3, 'CONFIRMED')
          `,
          [customerB.id, tableRow.id, shiftRow.id],
        ),
    );
    results.push(capacityFailure);

    const hardDeleteFailure = await expectFailure(
      client,
      'hard delete block',
      '55000',
      () => client.query('DELETE FROM users WHERE id = $1', [adminUserRow.id]),
    );
    results.push(hardDeleteFailure);

    const activeCountRow = await queryOne(
      client,
      `SELECT COUNT(*) AS count FROM reservations WHERE customer_id = $1 AND status = 'CONFIRMED'`,
      [customerA.id],
    );
    if (asNumber(activeCountRow.count) !== 1) {
      throw new Error('expected exactly one confirmed reservation to remain in the transaction');
    }

    await client.query('ROLLBACK');
  } catch (error) {
    failed = true;
    results.push({ name: 'verification run', ok: false, detail: `${error.code || 'ERROR'}: ${error.message}` });
    await client.query('ROLLBACK').catch(() => {});
  } finally {
    await client.end();
  }

  for (const result of results) {
    process.stdout.write(`${result.ok ? 'PASS' : 'FAIL'} ${result.name} - ${result.detail}\n`);
  }

  if (failed || results.some((result) => !result.ok)) {
    process.exitCode = 1;
    return;
  }

  process.stdout.write('Database verification completed successfully.\n');
}

main().catch((error) => {
  process.stderr.write(`${error.stack || error.message}\n`);
  process.exit(1);
});
