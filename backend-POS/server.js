// server.js
const express = require('express');
const cors = require('cors');
require('dotenv').config();


const db = require('./src/config/database'); // Conexión y tablas centralizadas

const app = express();


// Configuración CORS correcta (permite cookies cross-origin desde localhost:3000)
app.use(cors({
  origin: 'http://localhost:3000',      // Solo tu frontend Next.js
  credentials: true,                    // Permite enviar y recibir cookies
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

// Body parser con límite alto para imágenes base64
app.use(express.json({ limit: '2mb' }));
app.use(express.urlencoded({ limit: '2mb', extended: true }));

// Middleware de autenticación para SUPERdeveloper (lee cookies y setea req.user)
app.use((req, res, next) => {
  const cookies = req.headers.cookie || '';
  console.log('[AUTH MIDDLEWARE] Cookies recibidas:', cookies);

  const isSuperDev = cookies.includes('is-superdev=true');

  if (isSuperDev) {
    req.user = {
      isSuperDev: true,
      nickname: 'SUPERdeveloper'
    };
    console.log('[AUTH MIDDLEWARE] ¡SUPERdeveloper detectado! Acceso concedido');
  } else {
    console.log('[AUTH MIDDLEWARE] Usuario normal o sin cookie de superdev');
  }

  next();
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
// 🔥 RESET DE DATOS (protegido por superdev)
// =========================
app.use('/api/reset', require('./src/routes/resetRoutes'));

// =========================
// 🔥 CONFIGURACIÓN GENERAL
// =========================
app.use('/api/settings', require('./src/routes/settings.routes'));



// =========================
// RUTA DE HEALTH CHECK (nueva y útil)
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


// Puerto
const PORT = process.env.PORT || 5000;

app.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 Servidor corriendo en http://0.0.0.0:${PORT}`);
  console.log('   - CORS habilitado para http://localhost:3000');
  console.log('   - Middleware SUPERdeveloper activo');
  console.log('   - Base de datos inicializada correctamente');
  console.log('   - Rutas disponibles:');
  console.log('     - /api/cuts/current → Corte actual');
  console.log('     - /api/cuts → Registrar corte');
  console.log('     - /api/cuts/print/current → Imprimir corte actual');
  console.log('     - /health → Estado del servidor');
});
