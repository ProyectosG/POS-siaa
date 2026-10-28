// src/utils/seguridad.js
// Hash de contraseñas y conversión de las que siguen en texto plano.
const bcrypt = require('bcrypt');

const RONDAS = 10;

// Un hash de bcrypt siempre empieza con $2 ($2a$, $2b$, $2y$)
const esHash = (valor) => typeof valor === 'string' && valor.startsWith('$2');

const hashear = (texto) => bcrypt.hash(String(texto), RONDAS);

// Compara contra el hash; si por alguna razón sigue en texto plano, compara directo
async function comparar(texto, guardado) {
  if (!guardado || texto === undefined || texto === null) return false;
  if (esHash(guardado)) return bcrypt.compare(String(texto), guardado);
  return String(texto) === String(guardado);
}

const all = (db, sql, params = []) =>
  new Promise((resolve, reject) =>
    db.all(sql, params, (err, rows) => (err ? reject(err) : resolve(rows)))
  );

const run = (db, sql, params = []) =>
  new Promise((resolve, reject) =>
    db.run(sql, params, (err) => (err ? reject(err) : resolve()))
  );

// Columnas con secretos que deben guardarse con hash
const COLUMNAS_SECRETAS = [
  { tabla: 'users', columna: 'password' },
  { tabla: 'cash_registers', columna: 'password' },
  { tabla: 'settings', columna: 'dynamic_price_auth_key' },
];

// Al arrancar: convierte a hash lo que siga en texto plano.
// Cada quien sigue entrando con la misma contraseña de antes.
async function convertirSecretosPlanos(db) {
  let convertidos = 0;

  for (const { tabla, columna } of COLUMNAS_SECRETAS) {
    const filas = await all(
      db,
      `SELECT id, ${columna} AS valor FROM ${tabla}
       WHERE ${columna} IS NOT NULL AND ${columna} != '' AND ${columna} NOT LIKE '$2%'`
    );

    for (const fila of filas) {
      const hash = await hashear(fila.valor);
      await run(db, `UPDATE ${tabla} SET ${columna} = ? WHERE id = ?`, [hash, fila.id]);
      convertidos++;
    }
  }

  if (convertidos > 0) {
    console.log(`🔐 ${convertidos} contraseña(s) en texto plano convertidas a hash`);
  }
  return convertidos;
}

module.exports = { esHash, hashear, comparar, convertirSecretosPlanos };
