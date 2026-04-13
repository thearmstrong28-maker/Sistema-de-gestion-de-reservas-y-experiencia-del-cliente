const fs = require('node:fs');
const path = require('node:path');

const rootDir = path.resolve(__dirname, '..');

function copyIfMissing(source, target) {
  if (!fs.existsSync(source) || fs.existsSync(target)) {
    return false;
  }

  fs.copyFileSync(source, target);
  return true;
}

const copiedFiles = [];

if (copyIfMissing(path.join(rootDir, 'backend/.env.example'), path.join(rootDir, 'backend/.env'))) {
  copiedFiles.push('backend/.env');
}

if (
  copyIfMissing(
    path.join(rootDir, 'frontend/.env.example'),
    path.join(rootDir, 'frontend/.env.local'),
  )
) {
  copiedFiles.push('frontend/.env.local');
}

if (copiedFiles.length > 0) {
  process.stdout.write(`Created local env files: ${copiedFiles.join(', ')}\n`);
} else {
  process.stdout.write('Local env files already exist.\n');
}
