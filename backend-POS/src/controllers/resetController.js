// src/controllers/resetController.js
// Solo SuperDeveloper (lo exige resetRoutes.js con requireSuperDev)
const { prisma } = require('../config/prisma');
const { enTransaccion } = require('../config/transaccion');
const fs = require('fs');
const path = require('path');

// Únicas tablas que se pueden vaciar. Cualquier otro nombre se rechaza.
const TABLAS_PERMITIDAS = [
  'sale_details',
  'entry_details',
  'out_details',
  'kardex',
  'customer_balance_history',
  'codigo_barras_historial',
  'payments',
  'sales',
  'entries',
  'outs',
  'cuts',
  'products',
  'categories',
  'customers',
  'cash_registers',
  'users',
];

const { dirRespaldos: getBackupDir } = require('../utils/respaldos');

// Al borrar operaciones también se vacían sus claves de idempotencia y las
// autorizaciones de precio usadas (se refieren a registros que ya no existen)
const TABLAS_DE_OPERACIONES = ['sales', 'payments', 'entries', 'outs'];
const TABLAS_AUXILIARES = ['idempotencia', 'autorizaciones_usadas'];

exports.TABLAS_PERMITIDAS = TABLAS_PERMITIDAS;

exports.resetTables = async (req, res) => {
  const { tables, resetIds } = req.body;

  if (!tables || !Array.isArray(tables) || tables.length === 0) {
    return res.status(400).json({ error: 'Debes seleccionar al menos una tabla' });
  }

  const noPermitidas = tables.filter((t) => !TABLAS_PERMITIDAS.includes(t));
  if (noPermitidas.length > 0) {
    return res.status(400).json({ error: `Tablas no permitidas: ${noPermitidas.join(', ')}` });
  }

  try {
    // Respaldo consistente antes de borrar (VACUUM INTO no copia a medias)
    const backupDir = getBackupDir();
    fs.mkdirSync(backupDir, { recursive: true });
    const backupPath = path.join(backupDir, 'pos_backup_' + Date.now() + '.db');
    await prisma.$executeRawUnsafe(`VACUUM INTO '${backupPath.replace(/'/g, "''")}'`);
    console.log('[RESET] Respaldo creado en:', backupPath);

    const borraOperaciones = tables.some((t) => TABLAS_DE_OPERACIONES.includes(t));
    const aVaciar = borraOperaciones ? [...tables, ...TABLAS_AUXILIARES] : tables;

    // Se pueden vaciar tablas con registros que dependen de ellas (como antes):
    // las llaves foráneas se apagan en la conexión que usará la transacción.
    // La conexión siguiente las vuelve a tener activas.
    await prisma.$executeRawUnsafe('PRAGMA foreign_keys = OFF');
    try {
      await enTransaccion(async (tx) => {
        for (const table of aVaciar) {
          // table viene de las listas fijas de arriba
          await tx.$executeRawUnsafe(`DELETE FROM ${table}`);
          if (resetIds) await tx.$executeRawUnsafe('DELETE FROM sqlite_sequence WHERE name = ?', table);
        }
      });
    } finally {
      await prisma.$executeRawUnsafe('PRAGMA foreign_keys = ON');
    }

    res.json({
      message: '¡Boom! Datos zapeados con éxito. 💥',
      backup: path.basename(backupPath)
    });
  } catch (err) {
    console.error('[RESET] Error:', err);
    res.status(500).json({ error: '¡Ups! Error en el zap: ' + err.message });
  }
};

// Saldos de clientes y stocks a cero (sin kardex: herramienta del SuperDeveloper)
exports.resetBalances = async (req, res) => {
  try {
    await enTransaccion(async (tx) => {
      await tx.customers.updateMany({ data: { current_balance: 0 } });
      await tx.products.updateMany({ data: { stock: 0 } });
    });
    res.json({ message: '¡Saldos y stocks a cero! 🧹 Listo para un nuevo comienzo.' });
  } catch (err) {
    res.status(500).json({ error: 'Error al resetear balances: ' + err.message });
  }
};
