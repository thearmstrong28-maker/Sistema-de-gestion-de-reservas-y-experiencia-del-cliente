# Backend API - Restaurant Reservations

Backend NestJS + PostgreSQL + TypeORM para gestionar reservas, clientes, lista de espera y reportes operativos.

## Setup

```bash
npm install
```

## Base de datos

El esquema SQL versionado vive en `backend/database`:

- `001_initial_schema.sql`
- `002_reservations_created_by.sql`
- `003_user_classes.sql`

Aplicar y verificar:

```bash
npm run db:apply
npm run db:verify
```

Variables por defecto:

```bash
DB_HOST=localhost
DB_PORT=5432
DB_USER=postgres
DB_PASSWORD=34343434
DB_NAME="Sistema de gestión de reservas y experiencia del cliente"
```

## Autenticacion y RBAC

- JWT obligatorio para endpoints funcionales.
- `admin` / `host`: reservas, clientes, lista de espera.
- `manager`: lectura de disponibilidad y reportes.
- `admin` + `manager`: reportes.

## Endpoints por requerimiento funcional

### RF-01 Registrar reserva

- `POST /reservations`

### RF-02 Modificar reserva

- `PATCH /reservations/:id`

### RF-03 Cancelar reserva

- `PATCH /reservations/:id/cancel`

### RF-04 Marcar no-show

- `PATCH /reservations/:id/no-show`

### RF-05 Registrar clientes con preferencias

- `POST /customers`
- `PATCH /customers/:id`

### RF-06 Historial de visitas del cliente

- `GET /customers/:id/visit-history`
- `GET /customers?q=...` (listado/busqueda basica)

### RF-07 Asignar mesas por capacidad/turno/disponibilidad

- `PATCH /reservations/:id/assign-table`
- `GET /reservations/availability`

### RF-08 Reporte de ocupacion diaria

- `GET /reports/daily-occupancy`

### RF-09 Reporte de clientes frecuentes

- `GET /reports/frequent-customers`

### RF-10 Lista de espera ordenada

- `POST /waitlist`
- `GET /waitlist?date=YYYY-MM-DD&shiftId=<uuid>`
- `PATCH /waitlist/:id`

## Ejemplos curl

```bash
# Login
curl -X POST http://localhost:3000/auth/login \
  -H 'Content-Type: application/json' \
  -d '{"email":"admin@local.test","password":"<password>"}'

# RF-01 crear reserva
curl -X POST http://localhost:3000/reservations \
  -H "Authorization: Bearer <token>" \
  -H 'Content-Type: application/json' \
  -d '{
    "customerId":"<customer-uuid>",
    "shiftId":"<shift-uuid>",
    "partySize":4,
    "startsAt":"2026-04-08T19:00:00.000Z"
  }'

# RF-07 disponibilidad
curl "http://localhost:3000/reservations/availability?shiftId=<shift-uuid>&startsAt=2026-04-08T19:00:00.000Z&partySize=4" \
  -H "Authorization: Bearer <token>"

# RF-05 crear cliente
curl -X POST http://localhost:3000/customers \
  -H "Authorization: Bearer <token>" \
  -H 'Content-Type: application/json' \
  -d '{
    "fullName":"Ana Ruiz",
    "email":"ana@example.com",
    "phone":"+5491111111111",
    "preferences":{"allergies":["nuts"],"table":"window"}
  }'

# RF-10 crear entrada de waitlist
curl -X POST http://localhost:3000/waitlist \
  -H "Authorization: Bearer <token>" \
  -H 'Content-Type: application/json' \
  -d '{
    "customerId":"<customer-uuid>",
    "requestedShiftId":"<shift-uuid>",
    "requestedDate":"2026-04-08",
    "partySize":2
  }'

# RF-08 reporte ocupacion diaria
curl "http://localhost:3000/reports/daily-occupancy?date=2026-04-08" \
  -H "Authorization: Bearer <manager-or-admin-token>"

# RF-09 reporte clientes frecuentes
curl "http://localhost:3000/reports/frequent-customers?minVisits=2&limit=20" \
  -H "Authorization: Bearer <manager-or-admin-token>"
```

## Validacion recomendada

```bash
npm run db:apply
npm run db:verify
npm run lint
npm run test -- --runInBand
```
