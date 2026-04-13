# Sistema de Gestión de Reservas y Experiencia del Cliente

Sistema web completo para la gestión de reservas de un restaurante, desarrollado con **NestJS** (backend), **React + Vite** (frontend) y **PostgreSQL** (base de datos).

## Requisitos previos

- **Node.js** v20 o superior
- **npm** v9 o superior
- **Docker** y **Docker Compose** (recomendado) — o bien PostgreSQL 16 instalado localmente

## Inicio rápido con Docker (recomendado)

Esta es la forma más sencilla de levantar todo el sistema en cualquier computadora:

```bash
# 1. Clonar el repositorio
git clone <url-del-repositorio>
cd "Sistema de gestión de reservas y experiencia del cliente"

# 2. Levantar los 3 servicios (PostgreSQL, Backend, Frontend)
docker compose up --build
```

Eso es todo. Docker Compose levanta automáticamente:

| Servicio   | URL                         | Descripción                          |
|------------|-----------------------------|--------------------------------------|
| Frontend   | http://localhost:5173       | Interfaz de usuario (React + Vite)   |
| Backend    | http://localhost:3000       | API REST (NestJS)                    |
| API Docs   | http://localhost:3000/api   | Documentación Swagger automática     |
| PostgreSQL | localhost:5432              | Base de datos (solo acceso interno)  |

### Comandos Docker útiles

```bash
# Detener los servicios
docker compose down

# Reiniciar desde cero (borra datos de la BD)
docker compose down -v && docker compose up --build

# Ver logs de un servicio específico
docker compose logs -f backend
docker compose logs -f frontend
```

## Inicio manual (sin Docker)

Si prefieres ejecutar cada componente por separado, necesitas PostgreSQL instalado localmente.

### Opción A: Setup automatizado

```bash
# Ejecuta todo: crea archivos .env, instala dependencias, configura la BD
npm run setup
```

### Opción B: Setup paso a paso

```bash
# 1. Instalar dependencias
npm install
npm --prefix backend install
npm --prefix frontend install

# 2. Configurar variables de entorno
cp backend/.env.example backend/.env
cp frontend/.env.example frontend/.env.local

# 3. Crear la base de datos y aplicar el esquema
npm --prefix backend run db:apply

# 4. Verificar que la BD se creó correctamente
npm --prefix backend run db:verify

# 5. Iniciar en modo desarrollo (backend + frontend simultáneamente)
npm run dev
```

## Credenciales por defecto

| Rol          | Email             | Contraseña |
|--------------|-------------------|------------|
| Administrador| admin@local.test  | Admin123!  |

Una vez iniciada sesión como administrador, puedes crear usuarios adicionales con los roles: **host** (recepcionista), **manager** (gerente) y **customer** (cliente).

## Cargar datos de demostración

Para probar el sistema con datos realistas (clientes, reservas, lista de espera):

```bash
npm --prefix backend run db:apply
```

El esquema incluye datos semilla: usuario administrador, 3 turnos (mañana, tarde, noche) y 4 mesas. Para datos adicionales de demostración, ejecuta:

```bash
node backend/scripts/seed-demo-data.js
```

## Estructura del proyecto

```
├── backend/                 # API REST con NestJS + TypeORM
│   ├── src/
│   │   ├── auth/            # Autenticación JWT, guards, estrategias
│   │   ├── reservations/    # CRUD de reservas, asignación de mesas
│   │   ├── customers/       # Gestión de clientes, historial de visitas
│   │   ├── establishment/   # Mesas del restaurante, configuración
│   │   ├── waitlist/        # Lista de espera
│   │   ├── shifts/          # Turnos (mañana, tarde, noche)
│   │   ├── reports/         # Reportes de ocupación y métricas
│   │   └── users/           # Gestión de usuarios y roles
│   ├── database/            # Migraciones SQL (001-013)
│   └── scripts/             # Scripts de setup y verificación
├── frontend/                # SPA con React + Vite + TypeScript
│   └── src/
│       ├── components/      # Componentes reutilizables
│       ├── pages/           # Páginas por rol y funcionalidad
│       ├── stores/          # Estado global con Zustand
│       ├── services/        # Clientes HTTP (Axios)
│       └── utils/           # Helpers, labels, formateo
├── docker-compose.yml       # Orquestación de servicios
├── scripts/                 # Scripts de setup del proyecto raíz
└── package.json             # Scripts npm del monorepo
```

## Funcionalidades principales

- **Gestión de reservas**: crear, confirmar, cancelar, registrar llegada y no-show
- **Asignación de mesas**: asignación manual con validación de capacidad y disponibilidad
- **Lista de espera**: cuando no hay disponibilidad, los clientes entran en cola
- **Gestión de clientes**: registro, historial de visitas, contador automático
- **Turnos**: configuración de horarios por turno (mañana, tarde, noche)
- **Reportes**: ocupación diaria, métricas por turno, snapshots históricos
- **Control de acceso**: 4 roles con permisos diferenciados (admin, manager, host, customer)
- **Auditoría**: registro automático de cambios en todas las tablas principales
- **API documentada**: Swagger UI disponible en `/api`

## Variables de entorno

### Backend (`backend/.env`)

| Variable                              | Valor por defecto                      | Descripción                         |
|---------------------------------------|----------------------------------------|-------------------------------------|
| PORT                                  | 3000                                   | Puerto del servidor                 |
| DB_HOST                               | localhost                              | Host de PostgreSQL                  |
| DB_PORT                               | 5432                                   | Puerto de PostgreSQL                |
| DB_USER                               | postgres                               | Usuario de PostgreSQL               |
| DB_PASSWORD                           | postgres                               | Contraseña de PostgreSQL            |
| DB_NAME                               | restaurant_reservations                | Nombre de la base de datos          |
| JWT_ACCESS_SECRET                     | change-me-access-secret                | Secreto para tokens de acceso       |
| JWT_REFRESH_SECRET                    | change-me-refresh-secret               | Secreto para tokens de refresco     |
| CORS_ORIGIN                           | http://localhost:5173                  | Origen permitido para CORS          |
| RESTAURANT_TIMEZONE                   | America/Argentina/Buenos_Aires         | Zona horaria del restaurante        |
| RESERVATION_MAX_DAYS_AHEAD            | 30                                     | Días máximos de anticipación        |
| RESERVATION_DEFAULT_DURATION_MINUTES  | 90                                     | Duración predeterminada de reserva  |

### Frontend (`frontend/.env.local`)

| Variable     | Valor por defecto          | Descripción          |
|-------------|----------------------------|----------------------|
| VITE_API_URL | http://localhost:3000      | URL del backend API  |

## Scripts disponibles

| Comando              | Descripción                                          |
|----------------------|------------------------------------------------------|
| `npm run setup`      | Setup completo automatizado                          |
| `npm run setup:skip-db` | Setup sin pasos de base de datos (para Docker)    |
| `npm run dev`        | Inicia backend y frontend en modo desarrollo         |
| `npm run build`      | Compila backend y frontend para producción           |
| `npm run lint`       | Ejecuta el linter en backend y frontend              |
| `npm run test`       | Ejecuta tests del backend                            |
| `npm run docker:up`  | Levanta todo con Docker Compose                      |
| `npm run docker:down`| Detiene los servicios Docker                         |
| `npm run docker:reset`| Reinicia desde cero (borra datos)                   |

## Documentación

- `docs/arquitectura.md` - Arquitectura del sistema
- `docs/matriz-trazabilidad.md` - Trazabilidad de requisitos
- `docs/pruebas-minimas.md` - Pruebas mínimas

## Validación rápida

```bash
npm run lint
npm run test
```

## Solución de problemas

**El backend no conecta a PostgreSQL:**
Verifica que PostgreSQL esté corriendo y que las credenciales en `backend/.env` sean correctas. Con Docker, asegúrate de que el servicio `db` esté healthy: `docker compose ps`.

**Error de puertos en uso:**
Si el puerto 3000, 5173 o 5432 ya está ocupado, modifica las variables de entorno correspondientes o detén el servicio que lo esté usando.

**Reiniciar la base de datos desde cero:**
Con Docker: `docker compose down -v && docker compose up --build`.
Sin Docker: elimina la base de datos PostgreSQL manualmente y vuelve a ejecutar `npm run setup`.

## Tecnologías

- **Backend**: NestJS 11, TypeORM, PostgreSQL 16, Passport JWT, Swagger, bcrypt
- **Frontend**: React 19, Vite 8, TypeScript, Zustand, React Query, React Hook Form, Zod
- **Infraestructura**: Docker, Docker Compose
- **Metodología**: RUP (Proceso Unificado Racional), IEEE 830-1998
