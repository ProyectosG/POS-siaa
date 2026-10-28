// src/config/migraciones.js
// Migraciones de datos versionadas con PRAGMA user_version. Cada una corre una
// sola vez, dentro de una transacción (todo o nada). Antes de la primera se hace
// un respaldo completo de la base si ya tiene datos.
const fs = require('fs');
const path = require('path');
const db = require('./database');
const { enTransaccion } = require('./transaccion');
const { CAMPOS_DINERO } = require('../utils/dinero');
const { ahoraNegocio } = require('../utils/fechas');

const dirRespaldos = () =>
  process.env.BACKUP_DIR ? path.resolve(process.env.BACKUP_DIR) : path.join(__dirname, '../../backups');

const getMain = (sql, params = []) =>
  new Promise((resolve, reject) => db.get(sql, params, (err, row) => (err ? reject(err) : resolve(row))));
const runMain = (sql, params = []) =>
  new Promise((resolve, reject) => db.run(sql, params, (err) => (err ? reject(err) : resolve())));

// Respaldo consistente de la base completa (VACUUM INTO no copia a medias)
async function respaldar(motivo) {
  const dir = dirRespaldos();
  fs.mkdirSync(dir, { recursive: true });
  const destino = path.join(dir, `pos_antes_${motivo}_${Date.now()}.db`);
  await runMain(`VACUUM INTO '${destino.replace(/'/g, "''")}'`);
  console.log(`💾 Respaldo antes de migrar (${motivo}):`, destino);
  return destino;
}

// Saldo de cada cliente = lo que todavía debe de sus apartados y créditos abiertos
async function recalcularSaldos(tx, descripcion) {
  const { date, time } = ahoraNegocio();
  const clientes = await tx.all('SELECT id, current_balance FROM customers');

  for (const c of clientes) {
    const { debe } = await tx.get(
      `SELECT COALESCE(SUM(pending_balance), 0) AS debe
       FROM sales
       WHERE customer_id = ? AND LOWER(type) IN ('apartado', 'credito') AND pending_balance > 0`,
      [c.id]
    );
    const actual = Math.round(c.current_balance || 0);
    if (debe === actual) continue;

    await tx.run('UPDATE customers SET current_balance = ? WHERE id = ?', [debe, c.id]);
    await tx.run(
      `INSERT INTO customer_balance_history
       (customer_id, date, time, sale_id, previous_balance, amount, new_balance, description)
       VALUES (?, ?, ?, NULL, ?, ?, ?, ?)`,
      [c.id, date, time, actual, debe - actual, debe, descripcion]
    );
  }
}

const MIGRACIONES = [
  {
    version: 1,
    nombre: 'fase1',
    async aplicar(tx) {
      // 1. Dinero a centavos enteros
      for (const [tabla, campos] of Object.entries(CAMPOS_DINERO)) {
        for (const campo of campos) {
          await tx.run(
            `UPDATE ${tabla} SET ${campo} = CAST(ROUND(${campo} * 100) AS INTEGER) WHERE ${campo} IS NOT NULL`
          );
        }
      }

      // 2. Claves de operación ya procesadas (idempotencia)
      await tx.run(`CREATE TABLE IF NOT EXISTS idempotencia (
        id_user INTEGER NOT NULL,
        clave TEXT NOT NULL,
        ruta TEXT NOT NULL,
        status INTEGER NOT NULL,
        respuesta TEXT NOT NULL,
        creado TEXT NOT NULL,
        PRIMARY KEY (id_user, clave)
      )`);

      // 3. Renglones vendidos con precio libre (autorizado con la clave de precios)
      await tx.run('ALTER TABLE sale_details ADD COLUMN precio_libre INTEGER DEFAULT 0');

      // 4. Saldos de clientes: antes el apartado sumaba el anticipo en vez de lo que se debe
      await recalcularSaldos(tx, 'Ajuste: saldo recalculado con lo pendiente de apartados y créditos');
    },
  },
];

async function migrar() {
  await db.ready;
  const { user_version: actual } = await getMain('PRAGMA user_version');
  const pendientes = MIGRACIONES.filter((m) => m.version > actual);
  if (pendientes.length === 0) return;

  const { hay } = await getMain(
    `SELECT (SELECT COUNT(*) FROM sales) + (SELECT COUNT(*) FROM products) + (SELECT COUNT(*) FROM customers) AS hay`
  );
  if (hay > 0) await respaldar(pendientes[0].nombre);

  for (const m of pendientes) {
    await enTransaccion(async (tx) => {
      await m.aplicar(tx);
      await tx.run(`PRAGMA user_version = ${m.version}`);
    });
    console.log(`✅ Migración ${m.version} (${m.nombre}) aplicada`);
  }
}

module.exports = { migrar, recalcularSaldos };
