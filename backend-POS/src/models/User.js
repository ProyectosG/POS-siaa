const db = require('../config/database');

class User {
  static create({ nickname, full_name, phone, email, password, access_level }) {
    return new Promise((resolve, reject) => {
      db.run(
        `INSERT INTO users (nickname, full_name, phone, email, password, access_level) VALUES (?, ?, ?, ?, ?, ?)`,
        [nickname, full_name, phone, email, password, access_level],
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
}

module.exports = User;