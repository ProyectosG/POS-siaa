// src/config/transaccion.js
// Transacciones reales para las operaciones que mueven dinero o inventario
// (ventas, abonos, entradas, salidas, cortes).
//
// Por qué una conexión aparte: la conexión principal la comparten todas las
// peticiones; si una venta abre BEGIN ahí, las sentencias de otra petición se
// meten en su transacción. Esta conexión solo la usa la cola, y la cola deja
// pasar UNA transacción a la vez: lo que corre dentro es todo o nada.
const sqlite3 = require('sqlite3');
const db = require('./database');

let conexion = null;
let cola = Promise.resolve();

function abrirConexion() {
  if (conexion) return conexion;
  conexion = db.ready.then(
    () =>
      new Promise((resolve, reject) => {
        const c = new sqlite3.Database(db.dbPath, (err) => {
          if (err) return reject(err);
          c.configure('busyTimeout', 5000);
          c.run('PRAGMA foreign_keys = ON', (e) => (e ? reject(e) : resolve(c)));
        });
      })
  );
  return conexion;
}

// Funciones con promesa sobre una conexión
function envolver(c) {
  return {
    run: (sql, params = []) =>
      new Promise((resolve, reject) =>
        c.run(sql, params, function (err) {
          if (err) reject(err);
          else resolve({ lastID: this.lastID, changes: this.changes });
        })
      ),
    get: (sql, params = []) =>
      new Promise((resolve, reject) => c.get(sql, params, (err, row) => (err ? reject(err) : resolve(row)))),
    all: (sql, params = []) =>
      new Promise((resolve, reject) => c.all(sql, params, (err, rows) => (err ? reject(err) : resolve(rows)))),
  };
}

// Corre fn(tx) dentro de BEGIN IMMEDIATE ... COMMIT. Si fn lanza un error, ROLLBACK.
// Las llamadas se forman en cola: nunca hay dos transacciones mezcladas.
function enTransaccion(fn) {
  const tarea = cola.then(async () => {
    const tx = envolver(await abrirConexion());
    await tx.run('BEGIN IMMEDIATE');
    try {
      const resultado = await fn(tx);
      await tx.run('COMMIT');
      return resultado;
    } catch (err) {
      await tx.run('ROLLBACK').catch(() => {});
      throw err;
    }
  });
  // La cola sigue aunque esta transacción falle
  cola = tarea.catch(() => {});
  return tarea;
}

// Error con código HTTP: el controlador responde ese status con el mensaje
class ErrorNegocio extends Error {
  constructor(status, mensaje, extra = {}) {
    super(mensaje);
    this.status = status;
    this.extra = extra;
  }
}

// Cierra la conexión de transacciones (al apagar o al terminar las pruebas)
async function cerrarTransacciones() {
  if (!conexion) return;
  const c = await conexion.catch(() => null);
  conexion = null;
  if (c) await new Promise((resolve) => c.close(() => resolve()));
}

module.exports = { enTransaccion, ErrorNegocio, cerrarTransacciones };
