const mysql = require('mysql2');
require('dotenv').config();

// Bağlantı havuzu oluşturuyoruz (Daha hızlı çalışması için)
const pool = mysql.createPool({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0
});

// Promise yapısını kullanıma açıyoruz
const promisePool = pool.promise();

module.exports = promisePool;