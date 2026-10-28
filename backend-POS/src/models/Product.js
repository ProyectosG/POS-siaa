const db = require('../config/database');
const { aCentavos, filaAPesos, filasAPesos } = require('../utils/dinero');

// Precios: llegan y salen en pesos; en la base van en centavos
const PRECIOS = ['precio_menudeo', 'precio_mayoreo', 'precio_especial', 'precio_oferta'];

// Campos que se pueden modificar con update(). El stock NO: solo cambia con
// ventas, entradas y salidas, que dejan kardex (el formulario de productos
// mandaba el stock que tenía al abrirse y borraba las ventas de en medio).
const CAMPOS_EDITABLES = [
  'codigo_barras', 'codigo_interno', 'articulo', 'presentacion', 'unidad_medida',
  'precio_menudeo', 'precio_mayoreo', 'precio_especial', 'precio_oferta',
  'iva', 'ieps', 'category_id', 'photo_url', 'activo',
];

class Product {
  // Va DENTRO de una transacción, junto con el kardex del alta
  static async crear(tx, data) {
    const { lastID } = await tx.run(
        `INSERT INTO products 
        (codigo_barras, codigo_interno,articulo, presentacion, unidad_medida, precio_menudeo, precio_mayoreo, precio_especial, precio_oferta, 
          iva, ieps, stock, category_id, photo_url, activo)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          data.codigo_barras || null,          // codigo_barras
          data.codigo_interno || null,         // codigo_interno
          data.articulo.trim(),               // articulo
          data.presentacion || null,          // presentacion
          data.unidad_medida || null,         // unidad_medida
          aCentavos(data.precio_menudeo) || null,        // precio_menudeo
          aCentavos(data.precio_mayoreo) || null,        // precio_mayoreo
          aCentavos(data.precio_especial) || null,       // precio_especial
          aCentavos(data.precio_oferta) || null,         // precio_oferta
          data.iva || null,                    // iva
          data.ieps || null,                   // ieps
          data.stock || 0,                     // stock
          data.category_id || null,            // category_id
          data.photo_url || null,              // photo_url
          data.activo ? 1 : 0                  // activo
        ]
    );
    return lastID;
  }

  static findAll() {
    return new Promise((resolve, reject) => {
      db.all(
        `SELECT products.*, categories.family, categories.subfamily 
         FROM products 
         JOIN categories ON products.category_id = categories.id 
         ORDER BY articulo`, 
        [], 
        (err, rows) => {
          if (err) reject(err);
          else resolve(filasAPesos(rows, 'products'));
        }
      );
    });
  }

  static findByBarcode(codigo) {
    return new Promise((resolve, reject) => {
      db.get(
        `SELECT products.*, categories.family, categories.subfamily 
         FROM products 
         JOIN categories ON products.category_id = categories.id 
         WHERE products.codigo_barras = ? 
         LIMIT 1`,
        [codigo],
        (err, row) => {
          if (err) reject(err)
          else resolve(filaAPesos(row, 'products'))
        }
      )
    })
  }

  static searchByName(texto) {
    return new Promise((resolve, reject) => {
      db.all(
        `
        SELECT 
          products.id,
          products.codigo_barras,
          products.articulo,
          products.presentacion,
          products.stock,
          products.precio_menudeo,
          products.precio_mayoreo,
          products.precio_especial,
          products.precio_oferta,
          products.iva,
          products.category_id,
          categories.family,
          categories.subfamily
        FROM products
        JOIN categories ON products.category_id = categories.id
        WHERE products.articulo LIKE ?
          AND products.activo = 1
        ORDER BY products.articulo
        LIMIT 20
        `,
        [`%${texto}%`],
        (err, rows) => {
          if (err) reject(err)
          else resolve(filasAPesos(rows, 'products'))
        }
      )
    })
  }

  static findById(id) {
    return new Promise((resolve, reject) => {
      db.get(
        `SELECT products.*, categories.family, categories.subfamily 
         FROM products 
         JOIN categories ON products.category_id = categories.id 
         WHERE products.id = ?`,
        [id], 
        (err, row) => {
          if (err) reject(err);
          else resolve(filaAPesos(row, 'products'));
        }
      );
    });
  }

  // Solo campos de la lista fija; lo demás se ignora
  static update(id, data) {
    return new Promise((resolve, reject) => {
      const campos = CAMPOS_EDITABLES.filter(key => data[key] !== undefined);
      if (campos.length === 0) return resolve();

      const fields = campos.map(key => `${key} = ?`).join(', ');
      const values = campos.map(key => (PRECIOS.includes(key) ? aCentavos(data[key]) : data[key]));
      values.push(id);

      db.run(`UPDATE products SET ${fields} WHERE id = ?`, values, err => {
        if (err) reject(err);
        resolve();
      });
    });
  }

  static delete(id) {
    return new Promise((resolve, reject) => {
      db.run(`DELETE FROM products WHERE id = ?`, [id], err => {
        if (err) reject(err);
        resolve();
      });
    });
  }
}

module.exports = Product;