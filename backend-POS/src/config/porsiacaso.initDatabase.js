// src/config/initDatabase.js
const db = require('./database');

function initializeDatabase() {
  console.log('Inicializando base de datos SQLite...');

  // 1. Tabla USERS (usuarios del sistema)
  db.run(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      nickname TEXT UNIQUE NOT NULL,
      full_name TEXT,
      phone TEXT,
      email TEXT,
      password TEXT NOT NULL,
      access_level TEXT DEFAULT 'user' CHECK(access_level IN ('user', 'admin', 'superadmin')),
      photo_url TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `, (err) => {
    if (err) console.error('Error creando tabla users:', err.message);
    else console.log('Tabla users creada o ya existe');
  });

  // 2. Tabla CATEGORIES (categorías de productos)
  db.run(`
    CREATE TABLE IF NOT EXISTS categories (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT UNIQUE NOT NULL,
      description TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `, (err) => {
    if (err) console.error('Error creando tabla categories:', err.message);
    else console.log('Tabla categories creada o ya existe');
  });

  // 3. Tabla PRODUCTS (productos/inventario)
  db.run(`
    CREATE TABLE IF NOT EXISTS products (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      code TEXT UNIQUE,
      name TEXT NOT NULL,
      description TEXT,
      category_id INTEGER,
      price REAL NOT NULL,
      cost REAL,
      stock INTEGER DEFAULT 0,
      min_stock INTEGER DEFAULT 0,
      barcode TEXT,
      image_url TEXT,
      active BOOLEAN DEFAULT 1,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (category_id) REFERENCES categories(id)
    )
  `, (err) => {
    if (err) console.error('Error creando tabla products:', err.message);
    else console.log('Tabla products creada o ya existe');
  });

  // 4. Tabla CASH_REGISTERS (cajas registradoras)
  db.run(`
    CREATE TABLE IF NOT EXISTS cash_registers (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      number TEXT UNIQUE NOT NULL,
      name TEXT,
      location TEXT,
      status TEXT DEFAULT 'closed' CHECK(status IN ('open', 'closed')),
      opened_at DATETIME,
      closed_at DATETIME,
      initial_amount REAL DEFAULT 0,
      final_amount REAL,
      user_id INTEGER,
      FOREIGN KEY (user_id) REFERENCES users(id)
    )
  `, (err) => {
    if (err) console.error('Error creando tabla cash_registers:', err.message);
    else console.log('Tabla cash_registers creada o ya existe');
  });

  // 5. Tabla SALES (ventas)
  db.run(`
    CREATE TABLE IF NOT EXISTS sales (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER,
      caja_id INTEGER,
      total REAL NOT NULL,
      discount REAL DEFAULT 0,
      tax REAL DEFAULT 0,
      payment_method TEXT,
      status TEXT DEFAULT 'completed' CHECK(status IN ('completed', 'canceled', 'pending')),
      sale_date DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id),
      FOREIGN KEY (caja_id) REFERENCES cash_registers(id)
    )
  `, (err) => {
    if (err) console.error('Error creando tabla sales:', err.message);
    else console.log('Tabla sales creada o ya existe');
  });

  // 6. Tabla SALE_ITEMS (detalle de productos vendidos)
  db.run(`
    CREATE TABLE IF NOT EXISTS sale_items (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      sale_id INTEGER NOT NULL,
      product_id INTEGER NOT NULL,
      quantity INTEGER NOT NULL,
      price REAL NOT NULL,
      subtotal REAL NOT NULL,
      FOREIGN KEY (sale_id) REFERENCES sales(id) ON DELETE CASCADE,
      FOREIGN KEY (product_id) REFERENCES products(id)
    )
  `, (err) => {
    if (err) console.error('Error creando tabla sale_items:', err.message);
    else console.log('Tabla sale_items creada o ya existe');
  });

  // 7. Tabla PAYMENTS (pagos de ventas, abonos, anticipos)
  db.run(`
    CREATE TABLE IF NOT EXISTS payments (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      sale_id INTEGER,
      method TEXT NOT NULL,               -- efectivo, tarjeta, transferencia, etc.
      amount REAL NOT NULL,
      payment_type TEXT NOT NULL,         -- normal | anticipo | abono
      bank TEXT,
      last4 TEXT,
      reference TEXT,
      date DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (sale_id) REFERENCES sales(id) ON DELETE CASCADE
    )
  `, (err) => {
    if (err) console.error('Error creando tabla payments:', err.message);
    else console.log('Tabla payments creada o ya existe');
  });

  // 8. Tabla CUSTOMERS (clientes)
  db.run(`
    CREATE TABLE IF NOT EXISTS customers (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      phone TEXT,
      email TEXT,
      address TEXT,
      rfc TEXT,
      notes TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `, (err) => {
    if (err) console.error('Error creando tabla customers:', err.message);
    else console.log('Tabla customers creada o ya existe');
  });

  // 9. Tabla APARTADOS / ABONOS (ventas a crédito)
  db.run(`
    CREATE TABLE IF NOT EXISTS apartados (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      customer_id INTEGER,
      user_id INTEGER,
      total REAL NOT NULL,
      paid REAL DEFAULT 0,
      remaining REAL NOT NULL,
      status TEXT DEFAULT 'pending' CHECK(status IN ('pending', 'paid', 'canceled')),
      start_date DATETIME DEFAULT CURRENT_TIMESTAMP,
      due_date DATETIME,
      FOREIGN KEY (customer_id) REFERENCES customers(id),
      FOREIGN KEY (user_id) REFERENCES users(id)
    )
  `, (err) => {
    if (err) console.error('Error creando tabla apartados:', err.message);
    else console.log('Tabla apartados creada o ya existe');
  });

  // 10. Tabla ABONOS (pagos a apartados)
  db.run(`
    CREATE TABLE IF NOT EXISTS abonos (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      apartado_id INTEGER NOT NULL,
      amount REAL NOT NULL,
      payment_method TEXT,
      date DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (apartado_id) REFERENCES apartados(id) ON DELETE CASCADE
    )
  `, (err) => {
    if (err) console.error('Error creando tabla abonos:', err.message);
    else console.log('Tabla abonos creada o ya existe');
  });

  // 11. Tabla ENTRIES / ENTRADAS DE MERCANCÍA (compras/inventario)
  db.run(`
    CREATE TABLE IF NOT EXISTS entries (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER,
      total REAL NOT NULL,
      supplier TEXT,
      notes TEXT,
      entry_date DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id)
    )
  `, (err) => {
    if (err) console.error('Error creando tabla entries:', err.message);
    else console.log('Tabla entries creada o ya existe');
  });

  // 12. Tabla ENTRY_ITEMS (detalle de entradas)
  db.run(`
    CREATE TABLE IF NOT EXISTS entry_items (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      entry_id INTEGER NOT NULL,
      product_id INTEGER NOT NULL,
      quantity INTEGER NOT NULL,
      cost REAL NOT NULL,
      subtotal REAL NOT NULL,
      FOREIGN KEY (entry_id) REFERENCES entries(id) ON DELETE CASCADE,
      FOREIGN KEY (product_id) REFERENCES products(id)
    )
  `, (err) => {
    if (err) console.error('Error creando tabla entry_items:', err.message);
    else console.log('Tabla entry_items creada o ya existe');
  });

  // 13. Tabla CUTS / CORTES DE CAJA
  db.run(`
    CREATE TABLE IF NOT EXISTS cuts (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      caja_id INTEGER NOT NULL,
      user_id INTEGER NOT NULL,
      initial_amount REAL NOT NULL,
      final_amount REAL NOT NULL,
      total_sales REAL,
      total_cash REAL,
      total_card REAL,
      total_other REAL,
      cut_date DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (caja_id) REFERENCES cash_registers(id),
      FOREIGN KEY (user_id) REFERENCES users(id)
    )
  `, (err) => {
    if (err) console.error('Error creando tabla cuts:', err.message);
    else console.log('Tabla cuts creada o ya existe');
  });

  // Opcional: Crear un usuario admin de prueba si no existe
  db.get("SELECT id FROM users WHERE nickname = 'admin'", (err, row) => {
    if (err) {
      console.error('Error chequeando usuario admin:', err);
      return;
    }
    if (!row) {
      db.run(
        `INSERT INTO users (nickname, password, full_name, access_level) 
         VALUES (?, ?, ?, ?)`,
        ['admin', 'admin123', 'Administrador Inicial', 'admin'],
        (err) => {
          if (err) console.error('Error creando usuario admin de prueba:', err);
          else console.log('Usuario admin de prueba creado (nickname: admin, pass: admin123)');
        }
      );
    }
  });

  console.log('Inicialización de base de datos completada ✅');
}

module.exports = { initializeDatabase };