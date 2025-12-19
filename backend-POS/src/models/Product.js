const db = require('../config/database');

class Product {
  static create(data) {
    return new Promise((resolve, reject) => {
      db.run(
        `INSERT INTO products 
         (articulo, presentacion, unidad_medida, precio_menudeo, precio_mayoreo, precio_especial, precio_oferta, iva, ieps, stock, category_id, photo_url) 
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          data.articulo,
          data.presentacion,
          data.unidad_medida,
          data.precio_menudeo,
          data.precio_mayoreo,
          data.precio_especial,
          data.precio_oferta,
          data.iva,
          data.ieps,
          data.stock || 0,
          data.category_id || null,
          data.photo_url || null
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
      db.all(`SELECT * FROM products`, [], (err, rows) => {
        if (err) reject(err);
        resolve(rows);
      });
    });
  }

  static findById(id) {
    return new Promise((resolve, reject) => {
      db.get(`SELECT * FROM products WHERE id = ?`, [id], (err, row) => {
        if (err) reject(err);
        resolve(row);
      });
    });
  }

  static updateStock(id, newStock) {
    return new Promise((resolve, reject) => {
      db.run(`UPDATE products SET stock = ? WHERE id = ?`, [newStock, id], (err) => {
        if (err) reject(err);
        resolve();
      });
    });
  }
}

module.exports = Product;