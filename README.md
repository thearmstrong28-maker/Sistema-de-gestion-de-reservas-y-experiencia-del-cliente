# Sistema de Gestion de Reservas y Experiencia del Cliente

Base inicial de monorepo para el MVP del sistema de reservas de restaurante.

## Arquitectura base

- `backend/`: API REST con NestJS, MongoDB (Mongoose), JWT/Refresh Token, RBAC, validaciones y seguridad basica.
- `frontend/`: SPA con React + TypeScript + Vite, preparada para rutas, formularios, validacion, estado global y consumo de API.

## Estructura

```text
.
|-- backend/
|-- frontend/
`-- trello-iteracion-2-checklists.csv
```

## Requisitos

- Node.js 20+ recomendado
- npm 10+ recomendado

## Arranque rapido

### Backend (NestJS)

```bash
cd backend
npm run start:dev
```

API disponible por defecto en `http://localhost:3000`.

### Frontend (React + Vite)

```bash
cd frontend
npm run dev
```

Frontend disponible por defecto en `http://localhost:5173`.

## Dependencias base instaladas

### Backend

- Configuracion y seguridad: `@nestjs/config`, `helmet`, `cookie-parser`, `@nestjs/throttler`
- Auth y acceso: `@nestjs/jwt`, `@nestjs/passport`, `passport`, `passport-jwt`, `bcrypt`
- Persistencia y validacion: `@nestjs/mongoose`, `mongoose`, `class-validator`, `class-transformer`
- Documentacion: `@nestjs/swagger`

### Frontend

- Navegacion y datos: `react-router-dom`, `axios`, `@tanstack/react-query`
- Estado y formularios: `zustand`, `react-hook-form`, `@hookform/resolvers`, `zod`

## Autenticacion base

El backend incluye un `AuthModule` inicial con JWT access/refresh y RBAC.

- Usuario mock MVP:
  - Email: `admin@local.test`
  - Password: `Admin123!`
  - Rol: `Admin`
- El login devuelve `accessToken` y guarda `refreshToken` en cookie `httpOnly` (`sameSite=lax`, `secure=false` en local).

### Como probar

1. Iniciar backend:

```bash
cd backend
npm run start:dev
```

2. Login (`POST /auth/login`):

```bash
curl -i -X POST http://localhost:3000/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@local.test","password":"Admin123!"}'
```

3. Endpoint protegido (`GET /auth/me`) con Bearer token:

```bash
curl -X GET http://localhost:3000/auth/me \
  -H "Authorization: Bearer TU_ACCESS_TOKEN"
```

4. Refresh (`POST /auth/refresh`) usando cookie:

```bash
curl -i -X POST http://localhost:3000/auth/refresh \
  --cookie "refreshToken=TU_REFRESH_TOKEN"
```

## Proximo enfoque MVP

- Definir modulos de autenticacion (access + refresh) y RBAC en backend.
- Implementar dominio de reservas/mesas/clientes.
- Conectar frontend con API y flujo de login protegido por roles.
