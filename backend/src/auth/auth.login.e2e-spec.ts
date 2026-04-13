import { INestApplication } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import request from 'supertest';
import { DataSource } from 'typeorm';
import { AppModule } from '../app.module';

/* eslint-disable @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access */

interface RegisteredUserRow {
  last_login_at: string | null;
}

describe('Auth login (e2e)', () => {
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

  it('returns a usable access token and updates last_login_at', async () => {
    const suffix = `${Date.now()}-${Math.random().toString(16).slice(2)}`;
    const email = `login-${suffix}@example.test`;
    const restaurantName = `Casa del Sabor ${suffix}`;
    const password = 'StrongP@ss1';
    const httpServer = app.getHttpServer() as unknown as Parameters<
      typeof request
    >[0];
    try {
      await request(httpServer)
        .post('/auth/register')
        .send({
          email,
          phone: '+54 9 11 5555-4444',
          restaurantName,
          password,
        })
        .expect(201);

      const loginResponse = await request(httpServer)
        .post('/auth/login')
        .send({ email, password })
        .expect(201);

      expect(loginResponse.body).toEqual(
        expect.objectContaining({
          accessToken: expect.any(String),
        }),
      );

      const accessToken = loginResponse.body.accessToken as string;

      const meResponse = await request(httpServer)
        .get('/auth/me')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      expect(meResponse.body).toEqual(
        expect.objectContaining({
          email: email.toLowerCase(),
          role: 'admin',
        }),
      );

      const rows = await dataSource.query(
        `
          SELECT last_login_at
          FROM users
          WHERE email = $1
        `,
        [email.toLowerCase()],
      );

      expect(rows).toHaveLength(1);

      const row: RegisteredUserRow = rows[0];
      expect(row.last_login_at).not.toBeNull();
    } finally {
      await dataSource.query('DELETE FROM users WHERE email = $1', [
        email.toLowerCase(),
      ]);
    }
  });

  it('logs in a receptionist created by admin and returns host profile', async () => {
    const suffix = `${Date.now()}-${Math.random().toString(16).slice(2)}`;
    const adminEmail = `admin-${suffix}@example.test`;
    const restaurantName = `Casa del Sabor ${suffix}`;
    const adminPassword = 'StrongP@ss1';
    const hostEmail = `host-${suffix}@example.test`;
    const hostPassword = 'HostPass1';
    const hostName = `Recepcionista ${suffix}`;
    const httpServer = app.getHttpServer() as unknown as Parameters<
      typeof request
    >[0];

    try {
      await request(httpServer)
        .post('/auth/register')
        .send({
          email: adminEmail,
          phone: '+54 9 11 5555-4444',
          restaurantName,
          password: adminPassword,
        })
        .expect(201);

      const adminLoginResponse = await request(httpServer)
        .post('/auth/login')
        .send({ email: adminEmail, password: adminPassword })
        .expect(201);

      const adminAccessToken = adminLoginResponse.body.accessToken as string;

      await request(httpServer)
        .post('/users/internal')
        .set('Authorization', `Bearer ${adminAccessToken}`)
        .send({
          email: hostEmail,
          fullName: hostName,
          password: hostPassword,
          role: 'host',
        })
        .expect(201);

      const receptionistLoginResponse = await request(httpServer)
        .post('/auth/login-recepcionista')
        .send({
          identifier: hostEmail,
          password: hostPassword,
        })
        .expect(201);

      expect(receptionistLoginResponse.body).toEqual(
        expect.objectContaining({
          accessToken: expect.any(String),
          profile: expect.objectContaining({
            email: hostEmail.toLowerCase(),
            role: 'host',
          }),
        }),
      );
    } finally {
      await dataSource.query('DELETE FROM users WHERE email IN ($1, $2)', [
        adminEmail.toLowerCase(),
        hostEmail.toLowerCase(),
      ]);
    }
  });
});
