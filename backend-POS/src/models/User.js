// Actualiza tabla en src/config/database.js (agrega columna):
// photo_url TEXT

const db = require('../config/database');

class User {
  static create({ nickname, full_name, phone, email, password, access_level, photo_url }) {
    return new Promise((resolve, reject) => {
      db.run(
        `INSERT INTO users (nickname, full_name, phone, email, password, access_level, photo_url) 
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [nickname, full_name, phone, email, password, access_level, photo_url || null],
        function (err) {
          if (err) reject(err);
          resolve(this.lastID);
        }
      );
    });
  }

  static findByNickname(nickname) {
    return new Promise((resolve, reject) => {
      db.get(`SELECT * FROM users WHERE nickname = ?`, [nickname], (err, row) => {
        if (err) reject(err);
        resolve(row);
      });
    });
  }

  static findById(id) {
    return new Promise((resolve, reject) => {
      db.get(`SELECT * FROM users WHERE id = ?`, [id], (err, row) => {
        if (err) reject(err);
        resolve(row);
      });
    });
  }

  static updatePhoto(id, photo_url) {
    return new Promise((resolve, reject) => {
      db.run(`UPDATE users SET photo_url = ? WHERE id = ?`, [photo_url, id], (err) => {
        if (err) reject(err);
        resolve();
      });
    });
  }
}

module.exports = User;