// src/config/migraciones.js
// Migraciones de datos versionadas con PRAGMA user_version. Cada una corre una
// sola vez, dentro de una transacción (todo o nada). Antes de la primera se hace
// un respaldo completo de la base si ya tiene datos.
// Corren al arrancar, con la conexión sqlite3 del arranque (antes de que Prisma
// atienda nada).
const fs = require('fs');
const path = require('path');
const db = require('./database');
// Columnas de dinero que existían hasta la migración 4. Las migraciones 1 y 4 usan
// SIEMPRE esta lista: una migración que ya corrió no cambia, y una base vieja aún
// no tiene las columnas que agregan las migraciones siguientes (costo, costo_unitario).
const DINERO_HASTA_V4 = {
  products: ['precio_menudeo', 'precio_mayoreo', 'precio_especial', 'precio_oferta'],
  customers: ['current_balance'],
  sales: ['subtotal', 'tax_total', 'discount_total', 'total', 'paid', 'pending_balance', 'efectivo_recibido', 'cambio'],
  sale_details: ['base_price', 'price', 'discount_amount', 'subtotal', 'tax_amount'],
  payments: ['amount'],
  cuts: [
    'total_sales', 'ventas_contado', 'ventas_credito', 'ventas_apartado', 'total_iva_gravado',
    'total_recibido', 'total_anticipos', 'total_abonos',
    'pago_efectivo', 'pago_tarjeta', 'pago_transferencia', 'pago_otros', 'cash_in_box',
  ],
  customer_balance_history: ['previous_balance', 'amount', 'new_balance'],
};
const { ahoraNegocio } = require('../utils/fechas');

const dirRespaldos = () =>
  process.env.BACKUP_DIR ? path.resolve(process.env.BACKUP_DIR) : path.join(__dirname, '../../backups');

const getMain = (sql, params = []) =>
  new Promise((resolve, reject) => db.get(sql, params, (err, row) => (err ? reject(err) : resolve(row))));
const runMain = (sql, params = []) =>
  new Promise((resolve, reject) => db.run(sql, params, (err) => (err ? reject(err) : resolve())));
const allMain = (sql, params = []) =>
  new Promise((resolve, reject) => db.all(sql, params, (err, rows) => (err ? reject(err) : resolve(rows))));

// Transacción sobre la conexión del arranque: fn(tx) con tx.run/get/all
async function enTransaccionArranque(fn) {
  const tx = { run: runMain, get: getMain, all: allMain };
  await runMain('BEGIN IMMEDIATE');
  try {
    const resultado = await fn(tx);
    await runMain('COMMIT');
    return resultado;
  } catch (err) {
    await runMain('ROLLBACK').catch(() => {});
    throw err;
  }
}

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

// Migración 4: las columnas de dinero (DINERO_HASTA_V4) pasan de REAL a INTEGER.
// Desde la migración 1 guardan centavos enteros, pero declaradas REAL. SQLite no
// cambia el tipo de una columna: cada tabla se reconstruye (nueva tabla, copia,
// borrar la vieja, renombrar), conservando índices y el contador de folios.
// Ningún monto cambia: se comprueba suma y conteo de cada columna antes y después.
async function dineroAEntero(tx) {
  // 1. Todos los montos deben ser enteros: si alguno no lo es, no se redondea
  //    en silencio, se detiene la migración
  for (const [tabla, campos] of Object.entries(DINERO_HASTA_V4)) {
    for (const campo of campos) {
      const { n } = await tx.get(
        `SELECT COUNT(*) AS n FROM ${tabla} WHERE ${campo} IS NOT NULL AND ${campo} != CAST(${campo} AS INTEGER)`
      );
      if (n > 0) throw new Error(`${tabla}.${campo}: ${n} monto(s) con decimales; no se migra para no cambiar dinero`);
    }
  }

  // Suma y conteo de cada columna de dinero (para comparar después)
  const medir = async () => {
    const r = {};
    for (const [tabla, campos] of Object.entries(DINERO_HASTA_V4)) {
      for (const campo of campos) {
        const fila = await tx.get(`SELECT COUNT(*) AS filas, COUNT(${campo}) AS con_valor, TOTAL(${campo}) AS suma FROM ${tabla}`);
        r[`${tabla}.${campo}`] = fila;
      }
    }
    return r;
  };
  const antes = await medir();

  for (const [tabla, campos] of Object.entries(DINERO_HASTA_V4)) {
    const { sql } = await tx.get(`SELECT sql FROM sqlite_master WHERE type = 'table' AND name = ?`, [tabla]);
    const indices = await tx.all(`SELECT sql FROM sqlite_master WHERE type IN ('index', 'trigger') AND tbl_name = ? AND sql IS NOT NULL`, [tabla]);
    const secuencia = await tx.get('SELECT seq FROM sqlite_sequence WHERE name = ?', [tabla]);

    // La misma definición con las columnas de dinero en INTEGER
    let nueva = sql.replace(new RegExp(`^CREATE TABLE (IF NOT EXISTS )?["\`]?${tabla}["\`]?`, 'i'), `CREATE TABLE ${tabla}_nueva`);
    if (nueva === sql) throw new Error(`No se reconoció la definición de ${tabla}`);
    for (const campo of campos) {
      const re = new RegExp(`(\\b${campo}\\s+)(\\w+)`, 'i');
      const tipo = (nueva.match(re) || [])[2];
      if (!tipo) throw new Error(`No se encontró la columna ${tabla}.${campo}`);
      if (tipo.toUpperCase() === 'INTEGER') continue;
      if (tipo.toUpperCase() !== 'REAL') throw new Error(`${tabla}.${campo} es ${tipo}, se esperaba REAL`);
      nueva = nueva.replace(re, '$1INTEGER');
    }

    await tx.run(nueva);
    await tx.run(`INSERT INTO ${tabla}_nueva SELECT * FROM ${tabla}`);
    await tx.run(`DROP TABLE ${tabla}`);
    await tx.run(`ALTER TABLE ${tabla}_nueva RENAME TO ${tabla}`);
    for (const { sql: s } of indices) await tx.run(s);
    // El contador de folios sigue donde iba (si no, tras borrar registros se
    // repetirían folios ya usados)
    if (secuencia) {
      await tx.run('UPDATE sqlite_sequence SET seq = MAX(seq, ?) WHERE name = ?', [secuencia.seq, tabla]);
      const { n } = await tx.get('SELECT COUNT(*) AS n FROM sqlite_sequence WHERE name = ?', [tabla]);
      if (n === 0) await tx.run('INSERT INTO sqlite_sequence (name, seq) VALUES (?, ?)', [tabla, secuencia.seq]);
    }
  }

  // 2. Ningún monto cambió y ya no queda ninguno guardado como REAL
  const despues = await medir();
  for (const clave of Object.keys(antes)) {
    if (JSON.stringify(antes[clave]) !== JSON.stringify(despues[clave])) {
      throw new Error(`${clave} cambió: ${JSON.stringify(antes[clave])} → ${JSON.stringify(despues[clave])}`);
    }
  }
  for (const [tabla, campos] of Object.entries(DINERO_HASTA_V4)) {
    for (const campo of campos) {
      const { n } = await tx.get(`SELECT COUNT(*) AS n FROM ${tabla} WHERE typeof(${campo}) = 'real'`);
      if (n > 0) throw new Error(`${tabla}.${campo}: quedaron ${n} valor(es) REAL`);
    }
  }
}

const MIGRACIONES = [
  {
    version: 1,
    nombre: 'fase1',
    async aplicar(tx) {
      // 1. Dinero a centavos enteros
      for (const [tabla, campos] of Object.entries(DINERO_HASTA_V4)) {
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
  {
    version: 2,
    nombre: 'fase2',
    async aplicar(tx) {
      // 1. Cada corte guarda el último pago que cubrió: el siguiente cuenta los cobros
      //    desde ahí (antes se contaban por el ticket de la venta y los abonos a
      //    apartados viejos no entraban en ningún corte).
      await tx.run('ALTER TABLE cuts ADD COLUMN last_payment_id INTEGER');
      // Cortes anteriores: se toman como cubiertos los pagos de sus tickets
      await tx.run(
        `UPDATE cuts SET last_payment_id = (
           SELECT MAX(p.id) FROM payments p WHERE p.sale_id <= cuts.last_ticket
         )
         WHERE last_ticket IS NOT NULL`
      );

      // 2. Autorizaciones de precio libre ya usadas (cada una sirve una sola vez)
      await tx.run(`CREATE TABLE IF NOT EXISTS autorizaciones_usadas (
        jti TEXT PRIMARY KEY,
        sale_id INTEGER,
        usado TEXT NOT NULL
      )`);
    },
  },
  {
    version: 3,
    nombre: 'autorizaciones',
    async aplicar(tx) {
      // En SQLite un "TEXT PRIMARY KEY" admite NULL, y Prisma no puede usar una
      // tabla así. Se reconstruye igual pero con jti NOT NULL (una autorización
      // sin jti no sirve para nada: no se puede volver a encontrar).
      await tx.run(`CREATE TABLE autorizaciones_usadas_nueva (
        jti TEXT NOT NULL PRIMARY KEY,
        sale_id INTEGER,
        usado TEXT NOT NULL
      )`);
      await tx.run(`INSERT INTO autorizaciones_usadas_nueva (jti, sale_id, usado)
        SELECT jti, sale_id, usado FROM autorizaciones_usadas WHERE jti IS NOT NULL`);
      await tx.run('DROP TABLE autorizaciones_usadas');
      await tx.run('ALTER TABLE autorizaciones_usadas_nueva RENAME TO autorizaciones_usadas');
    },
  },
  {
    version: 4,
    nombre: 'dinero_entero',
    // Reconstruir tablas exige las llaves foráneas apagadas (SQLite no deja
    // cambiarlo dentro de una transacción): el runner las apaga antes y revisa
    // con foreign_key_check antes de confirmar.
    sinLlavesForaneas: true,
    async aplicar(tx) {
      await dineroAEntero(tx);
    },
  },
  {
    version: 5,
    nombre: 'costo',
    async aplicar(tx) {
      // Costo del producto (centavos, neto con IVA, como lo cobra el proveedor) y
      // costo unitario guardado en cada renglón vendido: la utilidad de una venta
      // usa el costo del momento en que se vendió. Solo agrega columnas: las
      // ventas anteriores quedan sin costo (NULL) y no se toma el costo actual.
      await tx.run('ALTER TABLE products ADD COLUMN costo INTEGER');
      await tx.run('ALTER TABLE sale_details ADD COLUMN costo_unitario INTEGER');
    },
  },
  {
    version: 6,
    nombre: 'historial_codigos',
    async aplicar(tx) {
      // Quién cambió el código de barras y cuándo (fecha y hora del negocio,
      // como el kardex). La tabla existía vacía: nada la llenaba.
      await tx.run('ALTER TABLE codigo_barras_historial ADD COLUMN id_user INTEGER');
      await tx.run('ALTER TABLE codigo_barras_historial ADD COLUMN nickname_user TEXT');
      await tx.run('ALTER TABLE codigo_barras_historial ADD COLUMN date TEXT');
      await tx.run('ALTER TABLE codigo_barras_historial ADD COLUMN time TEXT');
      // La venta busca aquí un código que ya no existe (etiquetas viejas)
      await tx.run(
        'CREATE INDEX IF NOT EXISTS idx_codigo_barras_historial_anterior ON codigo_barras_historial (codigo_anterior)'
      );
      await tx.run(
        'CREATE INDEX IF NOT EXISTS idx_codigo_barras_historial_producto ON codigo_barras_historial (product_id)'
      );
    },
  },
  {
    version: 7,
    nombre: 'intentos_clave',
    async aplicar(tx) {
      // Intentos fallidos de claves (login, caja, SuperDeveloper, precio libre).
      // Antes vivían en memoria y se perdían al reiniciar el servidor.
      // bloqueado_hasta es texto ISO en UTC (un Int de Prisma no alcanza para milisegundos).
      await tx.run(`CREATE TABLE IF NOT EXISTS intentos_clave (
        llave TEXT PRIMARY KEY NOT NULL,
        fallos INTEGER NOT NULL DEFAULT 0,
        bloqueado_hasta TEXT,
        updated_at TEXT DEFAULT CURRENT_TIMESTAMP
      )`);
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
    if (m.sinLlavesForaneas) await runMain('PRAGMA foreign_keys = OFF');
    try {
      await enTransaccionArranque(async (tx) => {
        await m.aplicar(tx);
        if (m.sinLlavesForaneas) {
          const rotas = await tx.all('PRAGMA foreign_key_check');
          if (rotas.length > 0) throw new Error(`Llaves foráneas rotas: ${JSON.stringify(rotas.slice(0, 5))}`);
        }
        await tx.run(`PRAGMA user_version = ${m.version}`);
      });
    } finally {
      if (m.sinLlavesForaneas) await runMain('PRAGMA foreign_keys = ON');
    }
    console.log(`✅ Migración ${m.version} (${m.nombre}) aplicada`);
  }
}

module.exports = { migrar, recalcularSaldos };
