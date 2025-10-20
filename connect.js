// connect.js
const mysql = require("mysql2");

const pool = mysql.createPool({
    host: "id-dci-web1321.main-hosting.eu",
    user: "u355073407_kelompok5",
    password: "Kelompok5bijikopi.",
    database: "u355073407_cs_kelompok5",
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0
});

pool.getConnection((err, connection) => {
    if (err) {
        console.error("❌ Database connection failed:", err.message);
    } else {
        console.log("✅ Database connected!");
        connection.release(); // lepas koneksi kembali ke pool
    }
});

// export versi promise supaya bisa pakai async/await
module.exports = pool.promise();
