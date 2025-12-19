// server.js
const express = require('express');
const cors = require('cors');
require('dotenv').config();

const db = require('./src/config/database'); // Conexión y tablas centralizadas

const app = express();

app.use(cors());
app.use(express.json());

// Aquí irán las rutas más adelante
// app.use('/api/products', require('./src/routes/productRoutes'));
// etc.

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});