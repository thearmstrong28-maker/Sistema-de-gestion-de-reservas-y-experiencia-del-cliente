#!/usr/bin/env node
/**
 * Complete setup script for the Restaurant Reservation System.
 * Handles environment files, dependency installation, database creation,
 * schema application, and verification.
 *
 * Usage:
 *   node scripts/setup-complete.js          # Full setup
 *   node scripts/setup-complete.js --skip-db # Skip database steps (if using Docker)
 */

const { execSync } = require('node:child_process');
const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.resolve(__dirname, '..');
const BACKEND = path.join(ROOT, 'backend');
const FRONTEND = path.join(ROOT, 'frontend');

const skipDb = process.argv.includes('--skip-db');

const CYAN = '\x1b[36m';
const GREEN = '\x1b[32m';
const YELLOW = '\x1b[33m';
const RED = '\x1b[31m';
const BOLD = '\x1b[1m';
const RESET = '\x1b[0m';

function log(msg) { console.log(`${CYAN}[setup]${RESET} ${msg}`); }
function success(msg) { console.log(`${GREEN}  ✓${RESET} ${msg}`); }
function warn(msg) { console.log(`${YELLOW}  ⚠${RESET} ${msg}`); }
function error(msg) { console.log(`${RED}  ✗${RESET} ${msg}`); }
function header(msg) { console.log(`\n${BOLD}${CYAN}═══ ${msg} ═══${RESET}\n`); }

function run(cmd, opts = {}) {
  try {
    execSync(cmd, { stdio: 'inherit', ...opts });
    return true;
  } catch {
    return false;
  }
}

function copyEnvIfMissing(src, dest) {
  if (!fs.existsSync(src)) { warn(`${src} not found`); return false; }
  if (fs.existsSync(dest)) { success(`${path.basename(dest)} already exists`); return false; }
  fs.copyFileSync(src, dest);
  success(`Created ${path.basename(dest)}`);
  return true;
}

// ────────── Main ──────────

async function main() {
  console.log(`
${BOLD}${CYAN}╔══════════════════════════════════════════════════════════╗
║  Sistema de Gestión de Reservas - Setup Completo        ║
╚══════════════════════════════════════════════════════════╝${RESET}
`);

  // 1. Environment files
  header('1/5 Archivos de entorno');
  copyEnvIfMissing(path.join(BACKEND, '.env.example'), path.join(BACKEND, '.env'));
  copyEnvIfMissing(path.join(FRONTEND, '.env.example'), path.join(FRONTEND, '.env.local'));

  // 2. Dependencies
  header('2/5 Instalando dependencias');
  log('Instalando dependencias del root...');
  if (!run('npm install', { cwd: ROOT })) { error('Fallo npm install en root'); process.exit(1); }
  success('Root dependencies installed');

  log('Instalando dependencias del backend...');
  if (!run('npm install', { cwd: BACKEND })) { error('Fallo npm install en backend'); process.exit(1); }
  success('Backend dependencies installed');

  log('Instalando dependencias del frontend...');
  if (!run('npm install', { cwd: FRONTEND })) { error('Fallo npm install en frontend'); process.exit(1); }
  success('Frontend dependencies installed');

  if (!skipDb) {
    // 3. Database
    header('3/5 Configurando base de datos');
    log('Creando base de datos y aplicando esquema...');
    if (!run('node scripts/apply-sql.js', { cwd: BACKEND })) {
      error('No se pudo aplicar el esquema SQL.');
      error('Asegúrate de tener PostgreSQL corriendo en localhost:5432');
      error('O usa Docker: docker compose up db -d');
      warn('Puedes saltar este paso con: node scripts/setup-complete.js --skip-db');
      process.exit(1);
    }
    success('Base de datos configurada correctamente');

    // 4. Verify
    header('4/5 Verificando base de datos');
    if (!run('node scripts/verify-db.js', { cwd: BACKEND })) {
      warn('La verificación tuvo advertencias (puede ser normal en primera ejecución)');
    } else {
      success('Verificación completada');
    }
  } else {
    header('3/5 Base de datos (OMITIDA)');
    warn('Se omitió la configuración de base de datos (--skip-db)');
    header('4/5 Verificación (OMITIDA)');
    warn('Se omitió la verificación de base de datos');
  }

  // 5. Summary
  header('5/5 Resumen');
  console.log(`
${GREEN}${BOLD}¡Setup completado exitosamente!${RESET}

${BOLD}Para iniciar el sistema:${RESET}
  ${CYAN}npm run dev${RESET}

${BOLD}URLs:${RESET}
  Frontend: ${CYAN}http://localhost:5173${RESET}
  Backend:  ${CYAN}http://localhost:3000${RESET}
  API Docs: ${CYAN}http://localhost:3000/api${RESET}

${BOLD}Credenciales por defecto:${RESET}
  Email:    ${CYAN}admin@local.test${RESET}
  Password: ${CYAN}Admin123!${RESET}

${BOLD}Con Docker:${RESET}
  ${CYAN}docker compose up${RESET}
`);
}

main().catch((e) => { error(e.message); process.exit(1); });
