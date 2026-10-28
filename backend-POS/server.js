// server.js
const express = require('express');
const cors = require('cors');
require('dotenv').config();

const db = require('./src/config/database'); // Conexión y tablas centralizadas
const { requireAuth } = require('./src/middleware/auth');
const { convertirSecretosPlanos } = require('./src/utils/seguridad');
const { migrar } = require('./src/config/migraciones');
const { zonaNegocio } = require('./src/utils/fechas');

const app = express();

// Puerto
const PORT = process.env.PORT || 5000;

// Orígenes permitidos (CORS_ORIGIN, separados por coma)
const CORS_ORIGINS = (process.env.CORS_ORIGIN || 'http://localhost:3000')
  .split(',')
  .map((o) => o.trim())
  .filter(Boolean);

app.use(cors({
  origin: CORS_ORIGINS,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'Idempotency-Key']
}));

// Body parser con límite alto para imágenes base64
app.use(express.json({ limit: '2mb' }));
app.use(express.urlencoded({ limit: '2mb', extended: true }));

// =========================
// AUTENTICACIÓN: todo /api exige token, salvo estas rutas
// =========================
const RUTAS_PUBLICAS = new Set([
  'POST /users/login',
  'POST /superdev/entrar',
]);

app.use('/api', (req, res, next) => {
  if (RUTAS_PUBLICAS.has(`${req.method} ${req.path}`)) return next();
  return requireAuth(req, res, next);
});

// =========================
// RUTAS PRINCIPALES
// =========================
app.use('/api/products', require('./src/routes/productRoutes'));
app.use('/api/categories', require('./src/routes/categoryRoutes'));
app.use('/api/users', require('./src/routes/userRoutes'));
app.use('/api/cash-registers', require('./src/routes/cashRegisterRoutes'));

// =========================
// 🔥 VENTAS (aquí está la ruta completa con /range)
app.use('/api/sales', require('./src/routes/sales.routes'));

// =========================
// 🔥 APARTADOS (ABONOS / LIQUIDACIONES)
// =========================
app.use('/api/apartados', require('./src/routes/apartados.routes'));

// =========================
// 🔥 TICKETS (texto / impresión)
// =========================
app.use('/api/tickets', require('./src/routes/tickets.routes'));

// =========================
// 🔥 ENTRADAS / INVENTARIO
// =========================
app.use('/api/entries', require('./src/routes/entries'));
app.use('/api/kardex', require('./src/routes/kardexRoutes'));

// =========================
// 🔥 SALIDAS DE INVENTARIO (OUTS)
// =========================
app.use('/api/outs', require('./src/routes/outRoutes'));

// =========================
// 🔥 CLIENTES
// =========================
app.use('/api/customers', require('./src/routes/customerRoutes'));

// =========================
// 🔥 CORTES DE CAJA
// =========================
app.use('/api/cuts', require('./src/routes/cutRoutes'));

// =========================
// 🔥 SUPERDEVELOPER (entrada) y RESET DE DATOS (solo SuperDeveloper)
// =========================
app.use('/api/superdev', require('./src/routes/superdev.routes'));
app.use('/api/reset', require('./src/routes/resetRoutes'));

// =========================
// 🔥 CONFIGURACIÓN GENERAL
// =========================
app.use('/api/settings', require('./src/routes/settings.routes'));

// =========================
// RUTA DE HEALTH CHECK (pública)
// =========================
app.get('/health', (req, res) => {
  res.status(200).json({
    status: 'ok',
    message: 'Servidor POS activo',
    database: 'conectado',
    timestamp: new Date().toISOString(),
    port: PORT
  });
});

// Se cumple cuando las tablas existen, las migraciones corrieron y las
// contraseñas viejas ya tienen hash
app.ready = db.ready
  .then(() => zonaNegocio())
  .then(() => migrar())
  .then(() => convertirSecretosPlanos(db));

module.exports = app;

// Solo escucha el puerto cuando se corre directo (node server.js)
if (require.main === module) {
  if (!process.env.JWT_SECRET) {
    console.error('❌ Falta JWT_SECRET en .env. El servidor no puede arrancar.');
    process.exit(1);
  }

  app.ready
    .then(() => {
      app.listen(PORT, '0.0.0.0', () => {
        console.log(`🚀 Servidor corriendo en http://0.0.0.0:${PORT}`);
        console.log(`   - CORS habilitado para ${CORS_ORIGINS.join(', ')}`);
        console.log(`   - SuperDeveloper ${process.env.SUPERDEV_USER && process.env.SUPERDEV_PASSWORD ? 'activo' : 'desactivado'}`);
      });
    })
    .catch((err) => {
      console.error('❌ Error al preparar la base de datos:', err);
      process.exit(1);
    });
}
