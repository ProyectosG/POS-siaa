// server.js
const express = require('express');
const cors = require('cors');
require('dotenv').config();

const db = require('./src/config/database'); // Conexión y tablas centralizadas

const app = express();

app.use(cors());
// Configuración de body parser con límite alto para imágenes base64
app.use(express.json({ limit: '2mb' }));
app.use(express.urlencoded({ limit: '2mb', extended: true }));


// Aquí irán las rutas más adelante
// app.use('/api/products', require('./src/routes/productRoutes'));
// etc.
app.use('/api/products', require('./src/routes/productRoutes'));
app.use('/api/categories', require('./src/routes/categoryRoutes'));
app.use('/api/users', require('./src/routes/userRoutes'));
app.use('/api/cash-registers', require('./src/routes/cashRegisterRoutes'));

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});