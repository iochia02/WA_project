'use strict';
/* Data Access Object (DAO) module for accessing users */

const sqlite = require('sqlite3');
const crypto = require('crypto');

// open the database
const db = new sqlite.Database('restaurant.db', (err) => {
  if(err) throw err;
});

/**
 * Retrieve the user from the db
 * @param id id of the user
 * @returns a Promise that resolves to the user object as:
 *          {id, username, name, secret}
 */
exports.getUserById = (id) => {
  return new Promise((resolve, reject) => {
    const sql = 'SELECT * FROM users WHERE id = ?';
      db.get(sql, [id], (err, row) => {
        if (err)
          reject(err);
        else if (row === undefined)
          resolve({error: 'User not found.'});
        else {
          // by default, the local strategy looks for "username":
          const user = {id: row.id, username: row.email, name: row.name, secret: row.secret}
          resolve(user);
        }
    });
  });
};

/**
 * Retrieve the user using email and password from the db
 * @param email email given by the user
 * @param password password given by the user
 * @returns a Promise that resolves to the user object as:
 *          {id, username, name, secret}
 */
exports.getUser = (email, password) => {
    return new Promise((resolve, reject) => {
      const sql = 'SELECT * FROM users WHERE email = ?';
      db.get(sql, [email], (err, row) => {
        if (err) { reject(err); }
        else if (row === undefined) { resolve(false); }
        else {
          const user = {id: row.id, username: row.email, name: row.name, secret: row.secret};
          // Verify that the password is correct comparing it to the hashed version stored in the db
          const salt = row.salt;
          crypto.scrypt(password, salt, 64, (err, hashedPassword) => {
            if (err) reject(err);

            const passwordHex = Buffer.from(row.password, 'hex');

            if(!crypto.timingSafeEqual(passwordHex, hashedPassword))
              resolve(false);
            else resolve(user);
          });
        }
      });
    });
  };

