// src/config/database.js
const sqlite3 = require('sqlite3').verbose();
require('dotenv').config();
const path = require('path');

const dbPath = path.join(__dirname, '../pos.db');

const db = new sqlite3.Database(dbPath, (err) => {
  if (err) {
    console.error('❌ Error al conectar a la base de datos:', err.message);
    process.exit(1);
  } else {
    console.log('✅ Conectado correctamente a SQLite →', dbPath);

    // Habilitar foreign keys
    db.run('PRAGMA foreign_keys = ON;', (err) => {
      if (err) {
        console.error('Error al habilitar foreign keys:', err.message);
      } else {
        console.log('Foreign keys habilitadas correctamente');
      }
    });
  }
});

// Inicialización de tablas y migraciones (todo dentro de serialize)
db.serialize(() => {
  // =========================
  // CATEGORIES
  // =========================
  db.run(`CREATE TABLE IF NOT EXISTS categories (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    family TEXT NOT NULL,
    subfamily TEXT
  )`);

  // =========================
  // PRODUCTS
  // =========================
  db.run(`CREATE TABLE IF NOT EXISTS products (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    codigo_barras TEXT UNIQUE,
    codigo_interno TEXT,
    articulo TEXT NOT NULL,
    presentacion TEXT,
    unidad_medida TEXT,
    precio_menudeo REAL,
    precio_mayoreo REAL,
    precio_especial REAL,
    precio_oferta REAL,
    iva REAL,
    ieps REAL,
    stock INTEGER DEFAULT 0,
    category_id INTEGER NOT NULL,
    photo_url TEXT,
    activo INTEGER DEFAULT 1,
    FOREIGN KEY (category_id) REFERENCES categories(id)
  )`);

  // =========================
  // USERS
  // =========================
  db.run(`CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    nickname TEXT UNIQUE,
    full_name TEXT,
    phone TEXT,
    email TEXT UNIQUE,
    password TEXT,
    access_level INTEGER,
    photo_url TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )`);

  // =========================
  // CUSTOMERS
  // =========================
  db.run(`CREATE TABLE IF NOT EXISTS customers (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    first_name TEXT,
    last_name_paternal TEXT,
    last_name_maternal TEXT,
    phone TEXT,
    email TEXT,
    address TEXT,
    rfc TEXT,
    postal_code TEXT,
    city TEXT,
    current_balance REAL DEFAULT 0
  )`);

  // =========================
  // SALES
  // =========================
  db.run(`CREATE TABLE IF NOT EXISTS sales (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    date TEXT NOT NULL,
    time TEXT,
    type TEXT,
    movement_reason TEXT,
    customer_id INTEGER,
    subtotal REAL NOT NULL,
    tax_total REAL NOT NULL DEFAULT 0,
    discount_total REAL DEFAULT 0,
    total REAL NOT NULL,
    paid REAL NOT NULL DEFAULT 0,
    pending_balance REAL DEFAULT 0,
    status TEXT DEFAULT 'pending',
    id_user INTEGER,
    nickname_user TEXT,
    efectivo_recibido REAL DEFAULT 0,
    cambio REAL DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,  -- ← Agregamos created_at aquí también
    FOREIGN KEY (customer_id) REFERENCES customers(id)
  )`);

  // Migraciones seguras para sales
  const salesMigrations = [
    "ALTER TABLE sales ADD COLUMN movement_reason TEXT",
    "ALTER TABLE sales ADD COLUMN id_user INTEGER",
    "ALTER TABLE sales ADD COLUMN nickname_user TEXT",
    "ALTER TABLE sales ADD COLUMN discount_total REAL DEFAULT 0",
    "ALTER TABLE sales ADD COLUMN pending_balance REAL DEFAULT 0",
    "ALTER TABLE sales ADD COLUMN status TEXT DEFAULT 'pending'",
    "ALTER TABLE sales ADD COLUMN time TEXT",
    "ALTER TABLE sales ADD COLUMN efectivo_recibido REAL DEFAULT 0",
    "ALTER TABLE sales ADD COLUMN cambio REAL DEFAULT 0",
    "ALTER TABLE sales ADD COLUMN created_at DATETIME DEFAULT CURRENT_TIMESTAMP"
  ];

  salesMigrations.forEach((sql) => {
    db.run(sql, (err) => {
      if (err && !err.message.includes('duplicate column name')) {
        console.error('Error en migración de sales:', sql, err.message);
      }
    });
  });

  // =========================
  // SALE DETAILS
  // =========================
  db.run(`CREATE TABLE IF NOT EXISTS sale_details (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    sale_id INTEGER NOT NULL,
    product_id INTEGER NOT NULL,
    articulo TEXT,  
    quantity INTEGER NOT NULL,
    base_price REAL,
    price REAL NOT NULL,
    discount_pct REAL,
    discount_amount REAL,
    subtotal REAL NOT NULL,
    tax_type TEXT,
    tax_rate REAL,
    tax_amount REAL,
    FOREIGN KEY (sale_id) REFERENCES sales(id) ON DELETE CASCADE,
    FOREIGN KEY (product_id) REFERENCES products(id)
  )`);

  // =========================
  // PAYMENTS
  // =========================
  db.run(`CREATE TABLE IF NOT EXISTS payments (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    sale_id INTEGER NOT NULL,
    method TEXT NOT NULL,
    amount REAL NOT NULL,
    payment_type TEXT NOT NULL DEFAULT 'normal',
    bank TEXT,
    last4 TEXT,
    reference TEXT,
    date TEXT NOT NULL,
    FOREIGN KEY (sale_id) REFERENCES sales(id) ON DELETE CASCADE
  )`);

  // =========================
  // CUTS ← Aquí agregamos created_at si no existe
  // =========================
  db.run(`CREATE TABLE IF NOT EXISTS cuts (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    type TEXT NOT NULL,
    date TEXT NOT NULL,
    desde TEXT NOT NULL,
    hasta TEXT NOT NULL,
    cash_register TEXT,
    user_nickname TEXT,
    total_sales REAL DEFAULT 0,
    ventas_contado REAL DEFAULT 0,
    ventas_credito REAL DEFAULT 0,
    ventas_apartado REAL DEFAULT 0,
    total_iva_gravado REAL DEFAULT 0,
    total_recibido REAL DEFAULT 0,
    total_anticipos REAL DEFAULT 0,
    total_abonos REAL DEFAULT 0,
    pago_efectivo REAL DEFAULT 0,
    pago_tarjeta REAL DEFAULT 0,
    pago_transferencia REAL DEFAULT 0,
    pago_otros REAL DEFAULT 0,
    cash_in_box REAL DEFAULT 0,
    first_ticket INTEGER,
    last_ticket INTEGER,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )`);

  // Migración para agregar created_at a cuts (solo si no existe)
  db.run(
    `ALTER TABLE cuts ADD COLUMN created_at DATETIME DEFAULT CURRENT_TIMESTAMP`,
    (err) => {
      if (err && !err.message.includes('duplicate column name')) {
        console.error('Error al agregar columna created_at a cuts:', err.message);
      } else if (!err) {
        console.log('Columna created_at agregada a cuts correctamente');
      }
    }
  );

  // Si la tabla ya existía sin created_at, actualizamos los registros viejos con fecha actual
  db.run(
    `UPDATE cuts SET created_at = datetime('now') WHERE created_at IS NULL`,
    (err) => {
      if (err) {
        console.error('Error al actualizar created_at en cortes existentes:', err.message);
      } else {
        console.log('created_at actualizado en registros existentes de cuts');
      }
    }
  );

  // =========================
  // KARDEX
  // =========================
  db.run(`CREATE TABLE IF NOT EXISTS kardex (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    product_id INTEGER NOT NULL,
    id_user INTEGER,
    nickname_user TEXT,
    movement_type TEXT NOT NULL CHECK (
      movement_type IN ('ALTA','BAJA','CAMBIO','ENTRADA','SALIDA','INVENTARIO')
    ),
    movement_reason TEXT,
    previous_stock INTEGER NOT NULL,
    moved_quantity INTEGER NOT NULL,
    new_stock INTEGER NOT NULL,
    date TEXT NOT NULL,
    time TEXT NOT NULL,
    related_folio TEXT,
    FOREIGN KEY (product_id) REFERENCES products(id)
  )`);

  // =========================
  // KARDEX REASONS
  // =========================
  db.run(`CREATE TABLE IF NOT EXISTS kardex_reasons (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    code TEXT UNIQUE NOT NULL,
    description TEXT NOT NULL,
    movement_type TEXT NOT NULL CHECK (
      movement_type IN ('ALTA','BAJA','CAMBIO','ENTRADA','SALIDA','INVENTARIO')
    ),
    active INTEGER DEFAULT 1
  )`);

  db.get(`SELECT COUNT(*) as count FROM kardex_reasons`, (err, row) => {
    if (!err && row.count === 0) {
      db.run(`
        INSERT INTO kardex_reasons (code, description, movement_type) VALUES
        ('VENTA_CONTADO', 'Venta de contado', 'SALIDA'),
        ('VENTA_CREDITO', 'Venta a credito', 'SALIDA'),
        ('VENTA_APARTADO', 'Venta en Apartado', 'SALIDA'),
        ('TRASPASO_SUCURSAL', 'Traspaso a sucursal', 'SALIDA'),
        ('MERMA', 'Merma o producto dañado', 'SALIDA'),
        ('AJUSTE_NEGATIVO', 'Ajuste negativo de inventario', 'SALIDA'),
        ('COMPRA_PROVEEDOR', 'Compra a proveedor', 'ENTRADA'),
        ('DEVOLUCION_CLIENTE', 'Devolucion de cliente', 'ENTRADA'),
        ('TRASPASO_ENTRADA', 'Entrada por traspaso', 'ENTRADA'),
        ('AJUSTE_POSITIVO', 'Ajuste positivo de inventario', 'ENTRADA'),
        ('INVENTARIO_FISICO', 'Inventario fisico', 'INVENTARIO'),
        ('CAMBIO_NOMBRE', 'Cambio de nombre', 'CAMBIO'),
        ('CAMBIO_PRECIO', 'Cambio de precio', 'CAMBIO'),
        ('ALTA_PRODUCTO', 'Alta de producto', 'ALTA'),
        ('BAJA_PRODUCTO', 'Baja de producto', 'BAJA')
      `, (seedErr) => {
        if (seedErr) {
          console.error('Error al seedear kardex_reasons:', seedErr.message);
        } else {
          console.log('Catálogo de kardex_reasons inicializado');
        }
      });
    }
  });

  // =========================
  // CASH_REGISTERS
  // =========================
  db.run(`CREATE TABLE IF NOT EXISTS cash_registers (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    numero_caja TEXT UNIQUE NOT NULL,
    tipo_caja TEXT DEFAULT 'Normal',
    password TEXT NOT NULL
  )`);

  // =========================
  // CODIGO_BARRAS_HISTORIAL
  // =========================
  db.run(`CREATE TABLE IF NOT EXISTS codigo_barras_historial (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    product_id INTEGER NOT NULL,
    codigo_anterior TEXT,
    codigo_nuevo TEXT,
    fecha TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(product_id) REFERENCES products(id)
  )`);

  // =========================
  // ENTRIES y ENTRY_DETAILS
  // =========================
  db.run(`CREATE TABLE IF NOT EXISTS entries (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    entry_type TEXT NOT NULL,
    comments TEXT,
    date TEXT NOT NULL,
    time TEXT NOT NULL,
    related_folio TEXT
  )`);

  db.run(`CREATE TABLE IF NOT EXISTS entry_details (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    entry_id INTEGER NOT NULL,
    product_id INTEGER NOT NULL,
    quantity REAL NOT NULL,
    FOREIGN KEY (entry_id) REFERENCES entries(id),
    FOREIGN KEY (product_id) REFERENCES products(id)
  )`);

    // =========================
  // OUTS y OUT_DETAILS (SALIDAS)
  // =========================
  db.run(`CREATE TABLE IF NOT EXISTS outs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    out_type TEXT NOT NULL,
    comments TEXT,
    date TEXT NOT NULL,
    time TEXT NOT NULL,
    related_folio TEXT,
    id_user INTEGER,
    nickname_user TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )`);

  db.run(`CREATE TABLE IF NOT EXISTS out_details (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    out_id INTEGER NOT NULL,
    product_id INTEGER NOT NULL,
    quantity REAL NOT NULL,
    FOREIGN KEY (out_id) REFERENCES outs(id) ON DELETE CASCADE,
    FOREIGN KEY (product_id) REFERENCES products(id)
  )`);


  // =========================
  // CUSTOMER BALANCE HISTORY
  // =========================
  db.run(`CREATE TABLE IF NOT EXISTS customer_balance_history (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    customer_id INTEGER NOT NULL,
    date TEXT NOT NULL,
    time TEXT NOT NULL,
    sale_id INTEGER,
    previous_balance REAL NOT NULL,
    amount REAL NOT NULL,
    new_balance REAL NOT NULL,
    description TEXT,
    FOREIGN KEY (customer_id) REFERENCES customers(id),
    FOREIGN KEY (sale_id) REFERENCES sales(id)
  )`);

  console.log('Inicialización de tablas y migraciones completada ✅');
});

// Cierre limpio al apagar el servidor
process.on('SIGINT', () => {
  db.close((err) => {
    if (err) console.error('Error al cerrar la DB:', err.message);
    console.log('Conexión a la base de datos cerrada');
    process.exit(0);
  });
});
// ==========================================
// ESTRUCTURA LIMPIA DE SETTINGS (RECREACIÓN)
// ==========================================
db.serialize(() => {
  db.run(`CREATE TABLE IF NOT EXISTS settings (
    id INTEGER PRIMARY KEY CHECK (id = 1),

    -- Ticket Header (4 líneas)
    ticket_header_line1 TEXT DEFAULT '',
    ticket_header_line2 TEXT DEFAULT '',
    ticket_header_line3 TEXT DEFAULT '',
    ticket_header_line4 TEXT DEFAULT '',

    -- Ticket Subheader (4 líneas)
    ticket_subheader_line1 TEXT DEFAULT '',
    ticket_subheader_line2 TEXT DEFAULT '',
    ticket_subheader_line3 TEXT DEFAULT '',
    ticket_subheader_line4 TEXT DEFAULT '',

    -- Ticket Footer (2 líneas)
    ticket_footer_line1 TEXT DEFAULT '',
    ticket_footer_line2 TEXT DEFAULT '',

    -- Ticket Config
    ticket_width INTEGER DEFAULT 58,
    auto_print_ticket INTEGER DEFAULT 1,

    -- Sales & Security Config
    allow_discounts INTEGER DEFAULT 1,
    max_discount_without_auth REAL DEFAULT 0,
    allow_negative_balance INTEGER DEFAULT 0,
    dynamic_price_auth_key TEXT DEFAULT '1234', -- Clave para liberar precios

    -- Customer Config
    customer_form_mode TEXT DEFAULT 'basic',

    -- Card Config
    card_payment_max_reprints INTEGER DEFAULT 1,

    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )`);

  // Registro inicial obligatorio
  db.get(`SELECT id FROM settings WHERE id = 1`, (err, row) => {
    if (!row) {
      db.run(`INSERT INTO settings (id) VALUES (1)`);
      console.log('--- NÚCLEO DE CONFIGURACIÓN INICIALIZADO ---');
    }
  });
});


module.exports = db;