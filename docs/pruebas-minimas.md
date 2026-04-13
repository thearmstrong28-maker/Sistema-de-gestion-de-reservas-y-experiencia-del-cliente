# Guia de pruebas minimas

## Objetivo

Validar que una persona pueda instalar, levantar y recorrer el sistema en localhost.

## Prerrequisitos

- Node.js 20 o superior.
- PostgreSQL local en `localhost:5432`.
- npm.

## Secuencia recomendada

1. Instalar dependencias:

```bash
npm run setup
```

2. Aplicar y verificar el esquema:

```bash
npm run db:apply
npm run db:verify
```

3. Levantar backend y frontend:

```bash
npm run dev
```

## Casos de humo

- Abrir `http://localhost:5173` y confirmar la pagina inicial.
- Registrar una administracion nueva desde `/registro`.
- Iniciar sesion como admin desde `/login`.
- Verificar acceso a `/recepcionista`, `/gerente` y `/administracion` segun rol.
- Validar que el backend responda en `http://localhost:3000/auth/me` con token valido.

## Verificacion automatica

```bash
npm run lint
npm run test
```

## Resultado esperado

- No hay errores de lint.
- Las pruebas del backend pasan.
- Las rutas principales cargan sin ajustes manuales adicionales.
