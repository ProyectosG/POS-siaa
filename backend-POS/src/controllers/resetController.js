// src/controllers/resetController.js
// Solo SuperDeveloper (lo exige resetRoutes.js con requireSuperDev)
const db = require('../config/database');
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

// Carpeta de respaldos (ignorada por git). BACKUP_DIR en .env la cambia.
const getBackupDir = () =>
  process.env.BACKUP_DIR
    ? path.resolve(process.env.BACKUP_DIR)
    : path.join(__dirname, '../../backups');

exports.TABLAS_PERMITIDAS = TABLAS_PERMITIDAS;

exports.resetTables = (req, res) => {
  const { tables, resetIds } = req.body;

  if (!tables || !Array.isArray(tables) || tables.length === 0) {
    return res.status(400).json({ error: 'Debes seleccionar al menos una tabla' });
  }

  const noPermitidas = tables.filter((t) => !TABLAS_PERMITIDAS.includes(t));
  if (noPermitidas.length > 0) {
    return res.status(400).json({ error: `Tablas no permitidas: ${noPermitidas.join(', ')}` });
  }

  try {
    const dbPath = db.dbPath;

    if (!fs.existsSync(dbPath)) {
      console.error('[RESET] Base de datos no encontrada en:', dbPath);
      return res.status(500).json({ error: 'Base de datos no encontrada' });
    }

    const backupDir = getBackupDir();
    fs.mkdirSync(backupDir, { recursive: true });
    const backupPath = path.join(backupDir, 'pos_backup_' + Date.now() + '.db');
    fs.copyFileSync(dbPath, backupPath);
    console.log('[RESET] Respaldo creado en:', backupPath);

    db.serialize(() => {
      // 1. DESACTIVAR LLAVES FORÁNEAS (Para evitar el error de restricción)
      db.run('PRAGMA foreign_keys = OFF');

      db.run('BEGIN TRANSACTION');

      tables.forEach((table) => {
        // table viene de la lista fija TABLAS_PERMITIDAS
        db.run(`DELETE FROM ${table}`, (err) => {
          if (err) console.error(`[RESET] Error borrando ${table}:`, err.message);
        });

        if (resetIds) {
          db.run(`DELETE FROM sqlite_sequence WHERE name = ?`, [table], (err) => {
            if (err) console.error(`[RESET] Error reseteando ID de ${table}:`, err.message);
          });
        }
      });

      db.run('COMMIT', (err) => {
        if (err) {
          console.error('[RESET] Error en COMMIT:', err);
          db.run('ROLLBACK');

          // Reactivamos FK incluso si falla el commit
          db.run('PRAGMA foreign_keys = ON');
          return res.status(500).json({ error: 'Error al ejecutar el reset' });
        }

        // 2. REACTIVAR LLAVES FORÁNEAS (Vital para la integridad futura)
        db.run('PRAGMA foreign_keys = ON', (err) => {
          if (err) console.error('[RESET] Error reactivando FK:', err.message);
        });

        res.json({
          message: '¡Boom! Datos zapeados con éxito. 💥',
          backup: path.basename(backupPath)
        });
      });
    });
  } catch (err) {
    console.error('[RESET] Error general:', err);
    db.run('ROLLBACK');
    db.run('PRAGMA foreign_keys = ON'); // Asegurar reactivación en catch
    res.status(500).json({ error: '¡Ups! Error en el zap: ' + err.message });
  }
};

exports.resetBalances = (req, res) => {
  try {
    db.serialize(() => {
      db.run('BEGIN TRANSACTION');
      db.run(`UPDATE customers SET current_balance = 0`);
      db.run(`UPDATE products SET stock = 0`);
      db.run('COMMIT', (err) => {
        if (err) {
          db.run('ROLLBACK');
          return res.status(500).json({ error: 'Error al confirmar reset de balances' });
        }
        res.json({ message: '¡Saldos y stocks a cero! 🧹 Listo para un nuevo comienzo.' });
      });
    });
  } catch (err) {
    db.run('ROLLBACK');
    res.status(500).json({ error: 'Error al resetear balances: ' + err.message });
  }
};
