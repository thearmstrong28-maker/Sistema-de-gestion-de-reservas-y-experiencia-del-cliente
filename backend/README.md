# Backend API

API REST del sistema, desarrollada con NestJS y PostgreSQL.

## Arranque local

```bash
npm install
```

Copiar `backend/.env.example` a `backend/.env` si todavia no existe.

## Base de datos

El esquema SQL versionado vive en `backend/database`.

```bash
npm run db:apply
npm run db:verify
npm run db:cleanup:example-customers
```

Valores locales por defecto:

```bash
DB_HOST=localhost
DB_PORT=5432
DB_USER=postgres
DB_PASSWORD=postgres
DB_NAME=restaurant_reservations
```

## Requisitos cubiertos

- Reservas: `POST /reservations`, `PATCH /reservations/:id`, `PATCH /reservations/:id/cancel`, `PATCH /reservations/:id/no-show`
- Clientes: `POST /customers`, `PATCH /customers/:id`, `GET /customers/:id/visit-history`
- Disponibilidad: `GET /reservations/availability`, `PATCH /reservations/:id/assign-table`
- Lista de espera: `POST /waitlist`, `GET /waitlist`, `PATCH /waitlist/:id`
- Reportes: `GET /reports/daily-occupancy`, `GET /reports/frequent-customers`
- Administracion: `GET /establishment`, `GET /users`, `POST /users/internal`

## Validacion

```bash
npm run lint
npm run test -- --runInBand
```
