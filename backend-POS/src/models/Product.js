const db = require('../config/database');

class Product {
  static create(data) {
    return new Promise((resolve, reject) => {
      db.run(
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
          data.precio_menudeo || null,        // precio_menudeo
          data.precio_mayoreo || null,        // precio_mayoreo
          data.precio_especial || null,       // precio_especial
          data.precio_oferta || null,         // precio_oferta
          data.iva || null,                    // iva
          data.ieps || null,                   // ieps
          data.stock || 0,                     // stock
          data.category_id || null,            // category_id
          data.photo_url || null,              // photo_url
          data.activo ? 1 : 0                  // activo
        ],
        function (err) {
          if (err) reject(err);
          resolve(this.lastID);
        }
      );

    });
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
          resolve(rows);
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
          resolve(row)
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
          resolve(rows)
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
          resolve(row);
        }
      );
    });
  }

  static update(id, data) {
    return new Promise((resolve, reject) => {
      const fields = Object.keys(data).map(key => `${key} = ?`).join(', ');
      const values = Object.values(data);
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