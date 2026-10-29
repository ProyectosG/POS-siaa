// src/utils/respaldos.js
// Carpeta de respaldos y respaldo manual ("Respaldar ahora" del SuperDeveloper).
const fs = require('fs');
const path = require('path');
const sqlite3 = require('sqlite3');
const { prisma } = require('../config/prisma');
const { ahoraNegocio } = require('./fechas');

// Carpeta de respaldos (ignorada por git). BACKUP_DIR en .env la cambia.
const dirRespaldos = () =>
  process.env.BACKUP_DIR ? path.resolve(process.env.BACKUP_DIR) : path.join(__dirname, '../../backups');

// Respaldos manuales: pos_respaldo_AAAA-MM-DD_HHMMSS_mmm.db (fecha y hora del
// negocio). Solo estos entran en la limpieza; los de migraciones
// (pos_antes_*) y los del reset (pos_backup_*) no se tocan.
const PATRON_MANUAL = /^pos_respaldo_\d{4}-\d{2}-\d{2}_\d{6}_\d{3}\.db$/;
const MAXIMO_MANUALES = 10;

function nombreManual(dir) {
  for (;;) {
    const ahora = new Date();
    const { date, time } = ahoraNegocio(ahora);
    const ms = String(ahora.getMilliseconds()).padStart(3, '0');
    const nombre = `pos_respaldo_${date}_${time.replace(/:/g, '')}_${ms}.db`;
    if (!fs.existsSync(path.join(dir, nombre))) return nombre;
  }
}

// Revisa la copia con una conexión aparte, solo de lectura: que SQLite la dé
// por sana y que tenga la misma versión de migraciones que la base
function verificar(archivo, versionEsperada) {
  return new Promise((resolve, reject) => {
    const c = new sqlite3.Database(archivo, sqlite3.OPEN_READONLY, (err) => {
      if (err) return reject(err);
      c.get('PRAGMA quick_check', (e1, revision) => {
        c.get('PRAGMA user_version', (e2, version) => {
          c.close(() => {
            const error = e1 || e2;
            if (error) return reject(error);
            if (revision?.quick_check !== 'ok') return reject(new Error(`La copia no pasó la revisión: ${revision?.quick_check}`));
            if (version.user_version !== versionEsperada) {
              return reject(new Error(`La copia tiene la versión ${version.user_version} y la base la ${versionEsperada}`));
            }
            resolve();
          });
        });
      });
    });
  });
}

// Deja solo los MAXIMO_MANUALES respaldos manuales más recientes
function limpiarManuales(dir) {
  const manuales = fs.readdirSync(dir).filter((f) => PATRON_MANUAL.test(f)).sort(); // el nombre ordena por fecha
  const sobran = manuales.slice(0, Math.max(0, manuales.length - MAXIMO_MANUALES));
  for (const f of sobran) fs.rmSync(path.join(dir, f), { force: true });
  return sobran;
}

// Respaldo completo con VACUUM INTO: seguro con el servidor encendido (espera a
// que termine la transacción en curso y copia en un solo momento, con lo que
// todavía esté en pos.db-wal). Devuelve { archivo, nombre, bytes }.
async function respaldarAhora() {
  const dir = dirRespaldos();
  fs.mkdirSync(dir, { recursive: true });
  const nombre = nombreManual(dir);
  const archivo = path.join(dir, nombre);

  const [{ user_version: version }] = await prisma.$queryRawUnsafe('PRAGMA user_version');
  await prisma.$executeRawUnsafe(`VACUUM INTO '${archivo.replace(/'/g, "''")}'`);
  try {
    await verificar(archivo, Number(version));
  } catch (err) {
    fs.rmSync(archivo, { force: true }); // nunca se entrega ni se guarda una copia dañada
    throw err;
  }

  limpiarManuales(dir);
  return { archivo, nombre, bytes: fs.statSync(archivo).size };
}

module.exports = { dirRespaldos, respaldarAhora, limpiarManuales, PATRON_MANUAL, MAXIMO_MANUALES };
