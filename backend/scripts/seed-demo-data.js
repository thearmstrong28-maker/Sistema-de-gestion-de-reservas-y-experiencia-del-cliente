#!/usr/bin/env node
/**
 * Seed demo data for testing the restaurant reservation system.
 * Creates sample customers, reservations, and waitlist entries
 * so the system can be demonstrated with realistic data.
 *
 * Usage:
 *   node backend/scripts/seed-demo-data.js
 *
 * Prerequisites:
 *   - Database must exist and schema must be applied (npm run db:apply)
 *   - backend/.env must be configured
 */

const { Client } = require('pg');
const path = require('node:path');
const { loadBackendEnv } = require('./load-env');

loadBackendEnv();

const DB_HOST = process.env.DB_HOST || 'localhost';
const DB_PORT = Number(process.env.DB_PORT || 5432);
const DB_USER = process.env.DB_USER || 'postgres';
const DB_PASSWORD = process.env.DB_PASSWORD || 'postgres';
const DB_NAME = process.env.DB_NAME || 'restaurant_reservations';
const DATABASE_URL = process.env.DATABASE_URL;

const CYAN = '\x1b[36m';
const GREEN = '\x1b[32m';
const YELLOW = '\x1b[33m';
const RED = '\x1b[31m';
const RESET = '\x1b[0m';

function log(msg) { console.log(`${CYAN}[seed]${RESET} ${msg}`); }
function success(msg) { console.log(`${GREEN}  ✓${RESET} ${msg}`); }
function warn(msg) { console.log(`${YELLOW}  ⚠${RESET} ${msg}`); }
function error(msg) { console.log(`${RED}  ✗${RESET} ${msg}`); }

async function main() {
  const client = new Client({
    connectionString: DATABASE_URL,
    host: DATABASE_URL ? undefined : DB_HOST,
    port: DATABASE_URL ? undefined : DB_PORT,
    user: DATABASE_URL ? undefined : DB_USER,
    password: DATABASE_URL ? undefined : DB_PASSWORD,
    database: DATABASE_URL ? undefined : DB_NAME,
  });

  await client.connect();
  log('Conectado a la base de datos');

  try {
    // Check if demo data already exists
    const existing = await client.query(
      "SELECT COUNT(*) as count FROM customers WHERE email LIKE '%@demo.test'"
    );
    if (Number(existing.rows[0].count) > 0) {
      warn('Los datos de demostración ya existen. Omitiendo.');
      return;
    }

    await client.query('BEGIN');

    // ── 1. Create demo customers ──
    log('Creando clientes de demostración...');
    const customers = [
      { name: 'María García López', email: 'maria.garcia@demo.test', phone: '+52 614 123 4567', notes: 'Prefiere mesa junto a la ventana' },
      { name: 'Carlos Rodríguez', email: 'carlos.rodriguez@demo.test', phone: '+52 614 234 5678', notes: 'Alérgico a mariscos' },
      { name: 'Ana Martínez Soto', email: 'ana.martinez@demo.test', phone: '+52 614 345 6789', notes: 'Cliente frecuente, cumpleaños en marzo' },
      { name: 'Roberto Hernández', email: 'roberto.hernandez@demo.test', phone: '+52 614 456 7890', notes: '' },
      { name: 'Laura Sánchez Pérez', email: 'laura.sanchez@demo.test', phone: '+52 614 567 8901', notes: 'Vegetariana' },
      { name: 'Diego Torres Ruiz', email: 'diego.torres@demo.test', phone: '+52 614 678 9012', notes: 'Prefiere zona terraza' },
      { name: 'Patricia Flores', email: 'patricia.flores@demo.test', phone: '+52 614 789 0123', notes: '' },
      { name: 'Fernando Jiménez', email: 'fernando.jimenez@demo.test', phone: '+52 614 890 1234', notes: 'Silla alta para bebé' },
      { name: 'Sofía Ramírez', email: 'sofia.ramirez@demo.test', phone: '+52 614 901 2345', notes: 'Celebración de aniversario' },
      { name: 'Miguel Ángel Vargas', email: 'miguel.vargas@demo.test', phone: '+52 614 012 3456', notes: '' },
    ];

    const customerIds = [];
    for (const c of customers) {
      const result = await client.query(
        `INSERT INTO customers (full_name, email, phone, notes, preferences, visit_count)
         VALUES ($1, $2, $3, $4, '{}'::jsonb, 0)
         ON CONFLICT (email) DO NOTHING
         RETURNING id`,
        [c.name, c.email, c.phone, c.notes]
      );
      if (result.rows.length > 0) {
        customerIds.push(result.rows[0].id);
      }
    }
    success(`${customerIds.length} clientes creados`);

    // ── 2. Get existing shifts and tables ──
    const shifts = await client.query('SELECT id, shift_name, starts_at, ends_at FROM shifts WHERE is_active = true ORDER BY starts_at');
    const tables = await client.query('SELECT id, table_number, capacity FROM restaurant_tables WHERE is_active = true ORDER BY table_number');

    if (shifts.rows.length === 0 || tables.rows.length === 0) {
      warn('No hay turnos o mesas activas. Ejecuta primero: npm run db:apply');
      await client.query('ROLLBACK');
      return;
    }

    // ── 3. Create reservations for today and upcoming days ──
    log('Creando reservas de demostración...');
    const today = new Date();
    let reservationCount = 0;

    // Helper to create a reservation
    async function createReservation(customerId, tableId, shiftRow, dayOffset, partySize, status, specialRequest) {
      const resDate = new Date(today);
      resDate.setDate(resDate.getDate() + dayOffset);
      const dateStr = resDate.toISOString().split('T')[0];

      const startsAt = new Date(`${dateStr}T${shiftRow.starts_at}`);
      const endsAt = new Date(startsAt.getTime() + 90 * 60 * 1000); // 90 min duration

      try {
        await client.query(
          `INSERT INTO reservations
           (customer_id, table_id, shift_id, reservation_date, starts_at, ends_at, party_size, status, special_requests,
            created_by_user_id)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8::reservation_status, $9,
            '00000000-0000-0000-0000-000000000001')`,
          [customerId, tableId, shiftRow.id, dateStr, startsAt, endsAt, partySize, status, specialRequest || null]
        );
        reservationCount++;
      } catch (e) {
        // Silently skip duplicates or constraint violations
        if (!e.message.includes('duplicate') && !e.message.includes('overlap') && !e.message.includes('ux_reservations_active')) {
          warn(`Reserva omitida: ${e.message.substring(0, 80)}`);
        }
      }
    }

    // Today's reservations (some confirmed, some pending, one completed)
    if (customerIds.length >= 6 && shifts.rows.length >= 2 && tables.rows.length >= 4) {
      const lunch = shifts.rows.find(s => s.shift_name === 'lunch') || shifts.rows[1];
      const dinner = shifts.rows.find(s => s.shift_name === 'dinner') || shifts.rows[shifts.rows.length - 1];
      const breakfast = shifts.rows.find(s => s.shift_name === 'breakfast') || shifts.rows[0];

      // Today - lunch
      await createReservation(customerIds[0], tables.rows[0].id, lunch, 0, 2, 'CONFIRMED', 'Mesa junto a ventana por favor');
      await createReservation(customerIds[1], tables.rows[1].id, lunch, 0, 4, 'CONFIRMED', null);
      await createReservation(customerIds[2], tables.rows[2].id, lunch, 0, 3, 'PENDING', 'Postre de cumpleaños');

      // Today - dinner
      await createReservation(customerIds[3], tables.rows[3].id, dinner, 0, 6, 'CONFIRMED', 'Cena de negocios');
      await createReservation(customerIds[4], tables.rows[0].id, dinner, 0, 2, 'PENDING', 'Menú vegetariano');

      // Tomorrow
      await createReservation(customerIds[5], tables.rows[2].id, lunch, 1, 4, 'CONFIRMED', 'Terraza preferida');
      await createReservation(customerIds[6], tables.rows[1].id, dinner, 1, 3, 'PENDING', null);
      await createReservation(customerIds[7], tables.rows[3].id, dinner, 1, 5, 'CONFIRMED', 'Silla alta necesaria');

      // Day after tomorrow
      await createReservation(customerIds[8], tables.rows[3].id, dinner, 2, 2, 'CONFIRMED', 'Aniversario - decoración especial');
      await createReservation(customerIds[9], tables.rows[1].id, lunch, 2, 4, 'PENDING', null);

      // Next week
      await createReservation(customerIds[0], tables.rows[2].id, dinner, 7, 2, 'PENDING', null);
      await createReservation(customerIds[2], tables.rows[3].id, lunch, 5, 4, 'CONFIRMED', 'Reunión familiar');
    }

    success(`${reservationCount} reservas creadas`);

    // ── 4. Create waitlist entries ──
    log('Creando entradas en lista de espera...');
    let waitlistCount = 0;

    if (customerIds.length >= 10 && shifts.rows.length >= 2) {
      const dinner = shifts.rows.find(s => s.shift_name === 'dinner') || shifts.rows[shifts.rows.length - 1];
      const tomorrow = new Date(today);
      tomorrow.setDate(tomorrow.getDate() + 1);
      const tomorrowStr = tomorrow.toISOString().split('T')[0];

      const waitlistEntries = [
        { customerId: customerIds[7], partySize: 4, notes: 'Prefiere después de las 20:00' },
        { customerId: customerIds[9], partySize: 6, notes: 'Grupo grande, flexible con horario' },
      ];

      for (let i = 0; i < waitlistEntries.length; i++) {
        const w = waitlistEntries[i];
        try {
          await client.query(
            `INSERT INTO waitlist_entries
             (customer_id, requested_shift_id, requested_date, party_size, status, position, notes)
             VALUES ($1, $2, $3, $4, 'waiting', $5, $6)`,
            [w.customerId, dinner.id, tomorrowStr, w.partySize, i + 1, w.notes]
          );
          waitlistCount++;
        } catch (e) {
          warn(`Waitlist omitida: ${e.message.substring(0, 80)}`);
        }
      }
    }
    success(`${waitlistCount} entradas en lista de espera creadas`);

    // ── 5. Update visit counts for some customers ──
    log('Actualizando contadores de visitas...');
    if (customerIds.length >= 3) {
      await client.query('UPDATE customers SET visit_count = 12 WHERE id = $1', [customerIds[0]]);
      await client.query('UPDATE customers SET visit_count = 8 WHERE id = $1', [customerIds[2]]);
      await client.query('UPDATE customers SET visit_count = 5 WHERE id = $1', [customerIds[1]]);
      await client.query('UPDATE customers SET visit_count = 3 WHERE id = $1', [customerIds[5]]);
    }
    success('Contadores de visitas actualizados');

    await client.query('COMMIT');

    console.log(`
${GREEN}¡Datos de demostración cargados exitosamente!${RESET}

  Clientes:        ${customerIds.length}
  Reservas:        ${reservationCount}
  Lista de espera: ${waitlistCount}

${CYAN}Inicia sesión con admin@local.test / Admin123! para ver los datos.${RESET}
`);
  } catch (e) {
    await client.query('ROLLBACK').catch(() => {});
    error(`Error: ${e.message}`);
    process.exit(1);
  } finally {
    await client.end();
  }
}

main().catch((e) => { console.error(e); process.exit(1); });
