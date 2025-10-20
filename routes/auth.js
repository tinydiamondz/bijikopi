const express = require("express");
const router = express.Router();
const db = require("../connect"); // pool.promise()
const session = require("express-session"); 

// Tampil halaman register
router.get("/register", (req, res) => {
    res.render("register", { error: null, success : null});
});

// ===================== REGISTER =====================
router.post("/register", async (req, res) => {
    const { fullname, email, pnumber, username, password } = req.body;

    try {
        // 1️⃣ Cek username/email
        const sqlCheck = `
            SELECT username_customer AS username, email_customer AS email FROM customer 
            WHERE username_customer = ? OR email_customer = ?
            UNION
            SELECT username_admin AS username, email_admin AS email FROM admin 
            WHERE username_admin = ? OR email_admin = ?
        `;
        const [results] = await db.query(sqlCheck, [username, email, username, email]);

        if (results.length > 0) {
            return res.render("register", {
                error: "Username atau Email sudah digunakan!",
                success: null
            });
        }
        
        // 2️⃣ Insert ke customer
        const sqlInsert = `
            INSERT INTO customer 
            (fullname_customer, email_customer, pnumber_customer, username_customer, password_customer)
            VALUES (?, ?, ?, ?, ?)
        `;
        await db.query(sqlInsert, [fullname, email, pnumber, username, password]);

        // 3️⃣ Sukses
        res.render("register", {
            success: "✅ Akun berhasil didaftarkan!",
            error: null
        });

    } catch (err) {
        console.error("❌ Database error:", err);
        res.render("register", {
            error: "Terjadi kesalahan server!",
            success: null
        });
    }
});



// Tampil halaman login
router.get("/login", (req, res) => {
    res.render("login", { error: null });
});

// Proses login
router.post("/login", async (req, res) => {
    const { username, password } = req.body;

    if (!username || !password) {
        return res.render("login", { error: "Username & Password harus diisi!" });
    }

    try {
        // Cek tabel admin dulu
        const sqlAdmin = "SELECT * FROM admin WHERE username_admin=? AND password_admin=?";
        const [resultAdmin] = await db.query(sqlAdmin, [username, password]);

        if (resultAdmin.length > 0) {
            // login sukses admin
            req.session.user = resultAdmin[0];
            req.session.role = "admin";
            return res.redirect("/admin/dashboard");
        }

        // Kalau tidak ada di admin, cek tabel customer
        const sqlCustomer = "SELECT * FROM customer WHERE username_customer=? AND password_customer=?";
        const [resultCust] = await db.query(sqlCustomer, [username, password]);

        if (resultCust.length > 0) {
            // login sukses customer
            req.session.user = resultCust[0];
            req.session.role = "customer";
            return res.redirect("/");
        }

        // Jika tidak ketemu di kedua tabel
        res.render("login", { error: "Username atau Password salah!" });

    } catch (err) {
        console.error("❌ Database error:", err);
        res.status(500).send("Server error");
    }
});

module.exports = router;
