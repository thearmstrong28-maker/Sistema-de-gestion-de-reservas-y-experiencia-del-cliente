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
  });

  afterAll(async () => {
    await app?.close();
  });

  it('persists register payload fields and hashes the password', async () => {
    const email = `registro-${Date.now()}-${Math.random().toString(16).slice(2)}@example.test`;
    const payload = {
      email,
      phone: '+54 9 11 5555-4444',
      restaurantName: 'Casa del Sabor',
      password: 'StrongP@ss1',
    };

    const httpServer = app.getHttpServer() as unknown as Parameters<
      typeof request
    >[0];

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
        role: 'customer',
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
        role: 'customer',
        is_active: true,
      }),
    );
    expect(row.password_hash).not.toBe(payload.password);
    expect(row.password_hash).toMatch(/^\$2[aby]\$/);
    expect(row.password_hash.length).toBeGreaterThan(payload.password.length);
  });
});
