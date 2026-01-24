// src/controllers/resetController.js
const db = require('../config/database');
const fs = require('fs');
const path = require('path');

exports.resetTables = (req, res) => {
  console.log('[RESET] Solicitud recibida:', req.body);

  if (!req.user || !req.user.isSuperDev) {
    console.log('[RESET] Acceso denegado');
    return res.status(403).json({ error: 'Acceso denegado. Solo superdevs!' });
  }

  const { tables, resetIds } = req.body;

  if (!tables || !Array.isArray(tables) || tables.length === 0) {
    return res.status(400).json({ error: 'Debes seleccionar al menos una tabla' });
  }

  try {
    // Ruta CORRECTA de tu pos.db (está en src/pos.db)
    const dbPath = path.join(__dirname, '../pos.db'); // ← __dirname es src/controllers, sube un nivel a src
    const backupPath = path.join(__dirname, '../../pos_backup_' + Date.now() + '.db');

    // Verifica que el archivo exista antes de copiar
    if (!fs.existsSync(dbPath)) {
      console.error('[RESET] ERROR: pos.db NO encontrado en:', dbPath);
      return res.status(500).json({ error: 'Base de datos pos.db no encontrada' });
    }

    fs.copyFileSync(dbPath, backupPath);
    console.log('[RESET] Backup creado en:', backupPath);

    db.serialize(() => {
      db.run('BEGIN TRANSACTION');

      tables.forEach(table => {
        console.log(`[RESET] Borrando tabla: ${table}`);
        db.run(`DELETE FROM ${table}`, (err) => {
          if (err) console.error(`Error borrando ${table}:`, err.message);
        });

        if (resetIds) {
          console.log(`[RESET] Reseteando ID de ${table}`);
          db.run(`DELETE FROM sqlite_sequence WHERE name = ?`, [table], (err) => {
            if (err) console.error(`Error reseteando ID de ${table}:`, err.message);
          });
        }
      });

      db.run('COMMIT', (err) => {
        if (err) {
          console.error('[RESET] Error en COMMIT:', err);
          db.run('ROLLBACK');
          return res.status(500).json({ error: 'Error al ejecutar el reset' });
        }
        console.log('[RESET] ¡Zap completado!');
        res.json({ 
          message: '¡Boom! Datos zapeados con éxito. 💥',
          backup: backupPath 
        });
      });
    });
  } catch (err) {
    console.error('[RESET] Error general:', err);
    db.run('ROLLBACK');
    res.status(500).json({ error: '¡Ups! Error en el zap: ' + err.message });
  }
};

exports.resetBalances = (req, res) => {
  if (!req.user || !req.user.isSuperDev) {
    return res.status(403).json({ error: 'Acceso denegado. Solo superdevs!' });
  }

  try {
    db.serialize(() => {
      db.run('BEGIN TRANSACTION');
      db.run(`UPDATE customers SET current_balance = 0`);
      db.run(`UPDATE products SET stock = 0`);
      db.run('COMMIT');
    });

    res.json({ message: '¡Saldos y stocks a cero! 🧹 Listo para un nuevo comienzo.' });
  } catch (err) {
    db.run('ROLLBACK');
    res.status(500).json({ error: 'Error al resetear balances: ' + err.message });
  }
};