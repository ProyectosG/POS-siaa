// src/controllers/resetController.js
// Solo SuperDeveloper (lo exige resetRoutes.js con requireSuperDev)
const { prisma } = require('../config/prisma');
const { enTransaccion } = require('../config/transaccion');
const Kardex = require('../models/Kardex');
const Customer = require('../models/Customer');
const { ahoraNegocio } = require('../utils/fechas');
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

// Respaldo consistente antes de borrar (VACUUM INTO no copia a medias). Devuelve la ruta.
async function respaldar() {
  const backupDir = getBackupDir();
  fs.mkdirSync(backupDir, { recursive: true });
  const backupPath = path.join(backupDir, 'pos_backup_' + Date.now() + '.db');
  await prisma.$executeRawUnsafe(`VACUUM INTO '${backupPath.replace(/'/g, "''")}'`);
  console.log('[RESET] Respaldo creado en:', backupPath);
  return backupPath;
}

// '1 cliente' / '3 clientes'
const cuantos = (n, uno, varios) => `${n} ${n === 1 ? uno : varios}`;

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
    const backupPath = await respaldar();

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

// Saldos de clientes y stocks a cero, sin romper el historial:
// - cada producto con stock distinto de 0 deja su ajuste en el kardex (folio RESET);
// - lo pendiente de créditos y apartados se perdona (pendiente 0) y el saldo de
//   cada cliente baja a 0 con moverSaldo, que deja historial.
// Todo en una transacción, con respaldo antes.
exports.resetBalances = async (req, res) => {
  try {
    const backupPath = await respaldar();

    const resumen = await enTransaccion(async (tx) => {
      const { date, time } = ahoraNegocio();

      const conStock = await tx.products.findMany({ where: { stock: { not: 0 } }, select: { id: true, stock: true } });
      await Kardex.registrarVarios(conStock.map((p) => ({
        product_id: p.id,
        id_user: req.user.id || null, // el SuperDeveloper no es un usuario de la tabla (id 0)
        nickname_user: req.user.nickname,
        movement_type: p.stock > 0 ? 'SALIDA' : 'ENTRADA',
        movement_reason: p.stock > 0 ? 'AJUSTE_NEGATIVO' : 'AJUSTE_POSITIVO',
        previous_stock: p.stock,
        moved_quantity: Math.abs(p.stock),
        new_stock: 0,
        date,
        time,
        related_folio: 'RESET',
      })), tx);
      await tx.products.updateMany({ where: { stock: { not: 0 } }, data: { stock: 0 } });

      // Deudas perdonadas: la venta queda sin pendiente (paid conserva lo que sí se cobró)
      const { count: ventas } = await tx.sales.updateMany({
        where: { pending_balance: { gt: 0 } },
        data: { pending_balance: 0, status: 'paid' },
      });

      const conSaldo = await tx.customers.findMany({ where: { current_balance: { not: 0 } }, select: { id: true, current_balance: true } });
      for (const c of conSaldo) {
        await Customer.moverSaldo(tx, c.id, -Math.round(c.current_balance), null, 'Saldo a cero (reset del SuperDeveloper)');
      }

      return { productos: conStock.length, clientes: conSaldo.length, ventas };
    });

    res.json({
      message: `¡Saldos y stocks a cero! 🧹 ${cuantos(resumen.productos, 'producto ajustado', 'productos ajustados')} en el kardex, ` +
        `${cuantos(resumen.clientes, 'cliente', 'clientes')} en $0 y ${cuantos(resumen.ventas, 'venta', 'ventas')} sin pendiente.`,
      ...resumen,
      backup: path.basename(backupPath),
    });
  } catch (err) {
    console.error('[RESET] Error en saldos y stocks:', err);
    res.status(500).json({ error: 'Error al resetear balances: ' + err.message });
  }
};
