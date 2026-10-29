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

const prisma = new PrismaClient({ adapter: new PrismaLibSql({ url: `file:${dbPath}` }) });

// Cierra la conexión de Prisma (al apagar o al terminar las pruebas)
async function cerrarPrisma() {
  await prisma.$disconnect();
}

module.exports = { prisma, cerrarPrisma };
