import { INestApplication } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import request from 'supertest';
import { DataSource } from 'typeorm';
import { AppModule } from '../app.module';

/* eslint-disable @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access */

interface RegisteredUserRow {
  email: string;
  phone: string | null;
  restaurant_name: string | null;
  password_hash: string;
  full_name: string;
  role: string;
  is_active: boolean;
}

describe('Auth register (e2e)', () => {
  let app: INestApplication;
  let dataSource: DataSource;

  beforeAll(async () => {
    process.env.DB_HOST ??= 'localhost';
    process.env.DB_PORT ??= '5432';
    process.env.DB_USER ??= 'postgres';
    process.env.DB_PASSWORD ??= 'postgres';
    process.env.DB_NAME ??= 'restaurant_reservations';
    process.env.DB_SYNCHRONIZE ??= 'false';

    const moduleRef: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleRef.createNestApplication();
    await app.init();
    dataSource = app.get(DataSource);
  });

  afterAll(async () => {
    await app?.close();
  });

  it('creates the initial restaurant administrator and hashes the password', async () => {
    const suffix = `${Date.now()}-${Math.random().toString(16).slice(2)}`;
    const email = `registro-${suffix}@example.test`;
    const payload = {
      email,
      phone: '+54 9 11 5555-4444',
      restaurantName: `Casa del Sabor ${suffix}`,
      password: 'StrongP@ss1',
    };

    const httpServer = app.getHttpServer() as unknown as Parameters<
      typeof request
    >[0];

    try {
      const response = await request(httpServer)
        .post('/auth/register')
        .send(payload)
        .expect(201);

      expect(response.body).toEqual(
        expect.objectContaining({
          email: email.toLowerCase(),
          fullName: payload.restaurantName,
          restaurantName: payload.restaurantName,
          phone: payload.phone,
          role: 'admin',
          isActive: true,
        }),
      );

      const rows = await dataSource.query(
        `
          SELECT email, phone, restaurant_name, password_hash, full_name, role, is_active
          FROM users
          WHERE email = $1
        `,
        [email.toLowerCase()],
      );

      expect(rows).toHaveLength(1);

      const row: RegisteredUserRow = rows[0];

      expect(row).toEqual(
        expect.objectContaining({
          email: email.toLowerCase(),
          phone: payload.phone,
          restaurant_name: payload.restaurantName,
          full_name: payload.restaurantName,
          role: 'admin',
          is_active: true,
        }),
      );
      expect(row.password_hash).not.toBe(payload.password);
      expect(row.password_hash).toMatch(/^\$2[aby]\$/);
      expect(row.password_hash.length).toBeGreaterThan(payload.password.length);
    } finally {
      await dataSource.query('DELETE FROM users WHERE email = $1', [
        email.toLowerCase(),
      ]);
    }
  });

  it('rejects a second active admin for the same restaurant', async () => {
    const suffix = `${Date.now()}-${Math.random().toString(16).slice(2)}`;
    const email = `registro-conflicto-${suffix}@example.test`;
    const payload = {
      email,
      phone: '+54 9 11 5555-4444',
      restaurantName: `Casa del Sabor ${suffix}`,
      password: 'StrongP@ss1',
    };

    const httpServer = app.getHttpServer() as unknown as Parameters<
      typeof request
    >[0];

    await request(httpServer).post('/auth/register').send(payload).expect(201);

    const duplicateEmail = `registro-conflicto-dup-${suffix}@example.test`;

    try {
      const conflictResponse = await request(httpServer)
        .post('/auth/register')
        .send({
          email: duplicateEmail,
          phone: '+54 9 11 5555-4444',
          restaurantName: payload.restaurantName,
          password: 'StrongP@ss1',
        })
        .expect(409);

      expect(conflictResponse.body).toEqual(
        expect.objectContaining({
          message: expect.stringContaining(
            'Ya existe un administrador activo para este restaurante',
          ),
        }),
      );
    } finally {
      await dataSource.query('DELETE FROM users WHERE email IN ($1, $2)', [
        email.toLowerCase(),
        duplicateEmail.toLowerCase(),
      ]);
    }
  });
});
