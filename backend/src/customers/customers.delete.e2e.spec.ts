import { INestApplication } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import request from 'supertest';
import { DataSource } from 'typeorm';
import { AppModule } from '../app.module';

/* eslint-disable @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access */

interface AuthResponse {
  accessToken: string;
}

async function cleanupCustomerArtifacts(
  dataSource: DataSource,
  customerId?: string,
  reservationId?: string,
): Promise<void> {
  if (!customerId) {
    return;
  }

  await dataSource.query('ALTER TABLE reservations DISABLE TRIGGER ALL');
  await dataSource.query('ALTER TABLE waitlist_entries DISABLE TRIGGER ALL');

  try {
    if (reservationId) {
      await dataSource.query('DELETE FROM reservations WHERE id = $1', [
        reservationId,
      ]);
    }

    await dataSource.query(
      'DELETE FROM waitlist_entries WHERE customer_id = $1',
      [customerId],
    );
    await dataSource.query('DELETE FROM customers WHERE id = $1', [customerId]);
  } finally {
    await dataSource.query('ALTER TABLE waitlist_entries ENABLE TRIGGER ALL');
    await dataSource.query('ALTER TABLE reservations ENABLE TRIGGER ALL');
  }
}

describe('Customers delete (e2e)', () => {
  let app: INestApplication;
  let dataSource: DataSource;
  let accessToken: string;
  let shiftId: string;

  beforeAll(async () => {
    process.env.DB_HOST ??= 'localhost';
    process.env.DB_PORT ??= '5432';
    process.env.DB_USER ??= 'postgres';
    process.env.DB_PASSWORD ??= '34343434';
    process.env.DB_NAME ??=
      'Sistema de gestión de reservas y experiencia del cliente';
    process.env.DB_SYNCHRONIZE ??= 'false';

    const moduleRef: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleRef.createNestApplication();
    await app.init();
    dataSource = app.get(DataSource);

    const seed = await dataSource.query(
      `
        SELECT
          (SELECT id FROM shifts ORDER BY created_at ASC LIMIT 1) AS shift_id
      `,
    );

    shiftId = seed[0]?.shift_id;

    if (!shiftId) {
      throw new Error(
        'Required seed data is missing for customers delete e2e tests',
      );
    }

    const adminEmail = 'admin@local.test';
    const adminPassword = 'Admin123!';

    const httpServer = app.getHttpServer() as unknown as Parameters<
      typeof request
    >[0];

    const loginResponse = await request(httpServer)
      .post('/auth/login')
      .send({ email: adminEmail, password: adminPassword })
      .expect(201);

    accessToken = (loginResponse.body as AuthResponse).accessToken;
  });

  afterAll(async () => {
    await app?.close();
  });

  it('returns a business 404 for a missing customer', async () => {
    const httpServer = app.getHttpServer() as unknown as Parameters<
      typeof request
    >[0];

    const response = await request(httpServer)
      .delete('/customers/00000000-0000-0000-0000-000000000000')
      .set('Authorization', `Bearer ${accessToken}`)
      .expect(404);

    expect(response.body).toEqual(
      expect.objectContaining({
        message: 'Customer not found',
        statusCode: 404,
      }),
    );
  });

  it('deletes a customer without reservations or waitlist entries', async () => {
    const httpServer = app.getHttpServer() as unknown as Parameters<
      typeof request
    >[0];
    const suffix = `${Date.now()}-${Math.random().toString(16).slice(2)}`;
    const email = `delete-customer-${suffix}@example.test`;
    let customerId: string | undefined;

    try {
      const createResponse = await request(httpServer)
        .post('/customers')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          fullName: `Cliente sin dependencias ${suffix}`,
          email,
          phone: `+54 9 11 ${String(Date.now()).slice(-8)}`,
        })
        .expect(201);

      customerId = createResponse.body.id as string;

      const deleteResponse = await request(httpServer)
        .delete(`/customers/${customerId}`)
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      expect(deleteResponse.body).toEqual(
        expect.objectContaining({
          email,
          fullName: expect.stringContaining('Cliente sin dependencias'),
        }),
      );

      const rows = await dataSource.query(
        'SELECT id FROM customers WHERE id = $1',
        [customerId],
      );
      expect(rows).toHaveLength(0);
    } finally {
      await cleanupCustomerArtifacts(dataSource, customerId);
    }
  });

  it('blocks deleting a customer with reservations', async () => {
    const httpServer = app.getHttpServer() as unknown as Parameters<
      typeof request
    >[0];
    const suffix = `${Date.now()}-${Math.random().toString(16).slice(2)}`;
    const email = `delete-customer-deps-${suffix}@example.test`;
    let customerId: string | undefined;
    let reservationId: string | undefined;

    try {
      const createResponse = await request(httpServer)
        .post('/customers')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          fullName: `Cliente con dependencias ${suffix}`,
          email,
          phone: `+54 9 11 ${String(Date.now()).slice(-8)}`,
        })
        .expect(201);

      customerId = createResponse.body.id as string;

      const reservationRows = await dataSource.query(
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
          VALUES ($1, NULL, $2, CURRENT_DATE, CURRENT_DATE + TIME '12:00', CURRENT_DATE + TIME '13:00', 2, 'CONFIRMED')
          RETURNING id
        `,
        [customerId, shiftId],
      );
      reservationId = reservationRows[0]?.id as string | undefined;

      const response = await request(httpServer)
        .delete(`/customers/${customerId}`)
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(400);

      expect(response.body).toEqual(
        expect.objectContaining({
          message:
            'No se puede eliminar un cliente con reservas, lista de espera o usuario vinculado.',
          statusCode: 400,
        }),
      );

      const rows = await dataSource.query(
        'SELECT id FROM customers WHERE id = $1',
        [customerId],
      );
      expect(rows).toHaveLength(1);
    } finally {
      await cleanupCustomerArtifacts(dataSource, customerId, reservationId);
    }
  });
});
