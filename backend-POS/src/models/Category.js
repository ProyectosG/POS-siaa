// src/models/Category.js
const db = require('../config/database');

class Category {
  static create({ family, subfamily }) {
    return new Promise((resolve, reject) => {
      db.run(
        `INSERT INTO categories (family, subfamily) VALUES (?, ?)`,
        [family, subfamily],
        function (err) {
          if (err) reject(err);
          resolve(this.lastID);
        }
      );
    });
  }

  static findAll() {
    return new Promise((resolve, reject) => {
      db.all(`SELECT * FROM categories`, [], (err, rows) => {
        if (err) reject(err);
        resolve(rows);
      });
    });
  }

  static findById(id) {
    return new Promise((resolve, reject) => {
      db.get(`SELECT * FROM categories WHERE id = ?`, [id], (err, row) => {
        if (err) reject(err);
        resolve(row);
      });
    });
  }
}

module.exports = Category;