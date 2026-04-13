# Arquitectura tecnica

## Alcance

El sistema esta organizado como un monorepo con dos aplicaciones principales:

- `backend/`: API REST con NestJS, TypeORM y PostgreSQL.
- `frontend/`: SPA con React, Vite y TypeScript.

## Backend

### Capas

- `src/main.ts`: arranque HTTP, CORS, `ValidationPipe` y cookies.
- `src/app.module.ts`: configuracion global, conexion a PostgreSQL y modulos funcionales.
- `src/auth/`: autenticacion JWT, refresh token, registro inicial y RBAC.
- `src/reservations/`: alta, edicion, cancelacion, asignacion de mesa y disponibilidad.
- `src/customers/`: clientes, preferencias y trazabilidad de visitas.
- `src/waitlist/`: lista de espera ordenada.
- `src/reports/`: reportes diarios y clientes frecuentes.
- `src/establishment/` y `src/users/`: administracion operativa.

### Persistencia

La base de datos se define en `backend/database/*.sql` y se aplica mediante `npm run db:apply`.
El esquema prioriza restricciones de integridad, vistas para reportes y semillas para local.

## Frontend

### Capas

- `src/App.tsx`: enrutamiento principal.
- `src/components/`: layout, guards y utilidades visuales.
- `src/pages/`: pantallas por rol y por dominio funcional.
- `src/api/`: cliente HTTP y contratos tipados.
- `src/store/`: estado de autenticacion persistido en `localStorage`.

### Flujo de usuario

1. Login por rol.
2. Bootstrap de sesion con `GET /auth/me`.
3. Acceso a pantallas protegidas por guardias de rol.

## Criterios de integracion

- El frontend consume la API mediante `VITE_API_URL`.
- El backend acepta cookies y tokens bearer.
- La documentacion y los scripts estan pensados para ejecucion local sin suposiciones ocultas.
