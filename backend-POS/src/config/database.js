const sqlite3 = require('sqlite3').verbose();
require('dotenv').config();

const db = new sqlite3.Database('./pos.db', (err) => {
  if (err) {
    console.error('Error connecting to database:', err.message);
  } else {
    console.log('Connected to SQLite database');
  }
});

db.serialize(() => {
  // Tablas actualizadas con todos los campos requeridos
  db.run(`CREATE TABLE IF NOT EXISTS categories (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    family TEXT NOT NULL,
    subfamily TEXT
  )`);

  db.run(`CREATE TABLE IF NOT EXISTS products (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
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
    category_id INTEGER,
    photo_url TEXT,
    FOREIGN KEY (category_id) REFERENCES categories(id)
  )`);

  db.run(`CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    nickname TEXT UNIQUE,
    full_name TEXT,
    phone TEXT,
    email TEXT UNIQUE,
    password TEXT,
    access_level INTEGER
  )`);

  db.run(`CREATE TABLE IF NOT EXISTS customers (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    first_name TEXT,
    last_name_paternal TEXT,
    last_name_maternal TEXT,
    phone TEXT,
    email TEXT,
    address TEXT,
    current_balance REAL DEFAULT 0
  )`);

  db.run(`CREATE TABLE IF NOT EXISTS sales (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    date TEXT,
    type TEXT,
    customer_id INTEGER,
    total REAL,
    paid REAL,
    pending_balance REAL DEFAULT 0,
    status TEXT,
    FOREIGN KEY (customer_id) REFERENCES customers(id)
  )`);

  db.run(`CREATE TABLE IF NOT EXISTS sale_details (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    sale_id INTEGER,
    product_id INTEGER,
    quantity INTEGER,
    price REAL,
    subtotal REAL,
    FOREIGN KEY (sale_id) REFERENCES sales(id),
    FOREIGN KEY (product_id) REFERENCES products(id)
  )`);

  db.run(`CREATE TABLE IF NOT EXISTS payments (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    sale_id INTEGER,
    amount REAL,
    date TEXT,
    FOREIGN KEY (sale_id) REFERENCES sales(id)
  )`);

  db.run(`CREATE TABLE IF NOT EXISTS cuts (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    type TEXT,
    date TEXT,
    total_sales REAL,
    cash_in_box REAL
  )`);

  db.run(`CREATE TABLE IF NOT EXISTS kardex (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    product_id INTEGER,
    movement_type TEXT,
    previous_stock INTEGER,
    moved_quantity INTEGER,
    new_stock INTEGER,
    date TEXT,
    time TEXT,
    related_folio TEXT,
    FOREIGN KEY (product_id) REFERENCES products(id)
  )`);
});

module.exports = db;