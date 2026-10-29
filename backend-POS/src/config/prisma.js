// src/config/prisma.js
// Cliente de Prisma: la única conexión a la base mientras el servidor atiende.
// Adaptador libsql: sus transacciones no se mezclan con otras peticiones (las
// demás consultas esperan a que terminen).
// El cliente se genera y compila a JavaScript con `npm run prisma:generar`
// (corre solo después de npm install). Las tablas y migraciones las crea el
// arranque (config/database.js y config/migraciones.js con sqlite3), que cierra
// su conexión antes de atender.
const { PrismaClient } = require('../generated/prisma-js/client');
const { PrismaLibSql } = require('@prisma/adapter-libsql');
const { dbPath } = require('./database');

// libsql abre una conexión NUEVA después de cada transacción (para permitir
// varias a la vez), y cada conexión nueva vuelve a preparar todas sus
// consultas: medido, era la mayor parte del costo de una venta. El adaptador
// de Prisma nunca deja correr dos transacciones a la vez (las forma en espera),
// así que aquí la transacción usa la misma conexión con BEGIN/COMMIT.
// Depende de cómo usa el adaptador al cliente (versión fija 7.10.1): lo cubren
// las pruebas de transacciones y la de carga.
class PrismaLibSqlUnaConexion extends PrismaLibSql {
  createClient(config) {
    const client = super.createClient(config);
    client.transaction = async (modo = 'write') => {
      await client.execute(modo === 'deferred' ? 'BEGIN DEFERRED' : 'BEGIN IMMEDIATE');
      let cerrada = false;
      const terminar = async (sql) => {
        if (cerrada) return;
        cerrada = true;
        await client.execute(sql);
      };
      return {
        execute: (stmt) => client.execute(stmt),
        commit: () => terminar('COMMIT'),
        rollback: () => terminar('ROLLBACK'),
        close: () => {
          if (!cerrada) terminar('ROLLBACK').catch(() => {});
        },
        get closed() {
          return cerrada;
        },
      };
    };
    return client;
  }
}

const prisma = new PrismaClient({ adapter: new PrismaLibSqlUnaConexion({ url: `file:${dbPath}` }) });

// Cierra la conexión de Prisma (al apagar o al terminar las pruebas)
async function cerrarPrisma() {
  await prisma.$disconnect();
}

module.exports = { prisma, cerrarPrisma };
