// prisma.config.js
// Configuración de Prisma (solo para el CLI: generate y db pull).
// Las migraciones NO son de Prisma: las hace src/config/migraciones.js.
require('dotenv').config();
const path = require('path');

const dbPath = process.env.DB_PATH
  ? path.resolve(process.env.DB_PATH)
  : path.join(__dirname, 'src/pos.db');

module.exports = {
  schema: 'prisma/schema.prisma',
  datasource: { url: `file:${dbPath}` },
};
