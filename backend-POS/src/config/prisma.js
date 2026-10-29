// src/config/prisma.js
// Cliente de Prisma sobre la misma base que config/database.js, con el
// adaptador libsql (sus transacciones no se mezclan con otras peticiones).
// El cliente se genera y compila a JavaScript con `npm run prisma:generar`
// (corre solo después de npm install). Las tablas y migraciones las sigue
// creando config/database.js y config/migraciones.js, no Prisma.
//
// Mientras Prisma conviva con las conexiones sqlite3, TODA consulta de modelo de
// Prisma pasa por la cola de transacciones (enCola): si Prisma tiene que esperar
// el candado de SQLite, detiene todo Node, y una transacción de sqlite3 a medias
// ya no podría terminar. Por lo mismo, durante la convivencia:
//   - no usar prisma.$transaction ni consultas crudas ($queryRaw, $executeRaw):
//     no pasan por la cola;
//   - no llamar a Prisma desde dentro de enTransaccion (esperaría a su propia cola).
const { PrismaClient } = require('../generated/prisma-js/client');
const { PrismaLibSql } = require('@prisma/adapter-libsql');
const { dbPath } = require('./database');
const { enCola } = require('./transaccion');

const base = new PrismaClient({ adapter: new PrismaLibSql({ url: `file:${dbPath}` }) });

// Si una sentencia suelta de la conexión principal tiene el candado, espera hasta
// 5 s (como el busyTimeout de sqlite3) en vez de fallar con SQLITE_BUSY. Esa
// sentencia corre fuera del hilo de Node, así que la espera siempre termina.
let preparado = null;
const preparar = () =>
  (preparado ??= base.$queryRawUnsafe('PRAGMA busy_timeout = 5000').catch((err) => {
    preparado = null;
    throw err;
  }));

const prisma = base.$extends({
  query: {
    $allModels: {
      $allOperations({ args, query }) {
        return enCola(async () => {
          await preparar();
          return query(args);
        });
      },
    },
  },
});

// Cierra la conexión de Prisma (al apagar o al terminar las pruebas)
async function cerrarPrisma() {
  await base.$disconnect();
}

module.exports = { prisma, cerrarPrisma };
