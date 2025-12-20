const express = require("express");
const router = express.Router();
const db = require("../connect"); // pool.promise()
const session = require("express-session"); 
const bcrypt = require("bcrypt");


// Tampil halaman register
router.get("/register", (req, res) => {
    res.render("register", { error: null, success : null});
});

// ===================== REGISTER =====================
router.post("/register", async (req, res) => {
    const { fullname, email, pnumber, username, password, retypepassword } = req.body;

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
                error: "Username or email is already taken!",
                success: null
            });
        }
        
        if(retypepassword != password) {
            return res.render("register", {
                error: "Password doesn't matches!",
                success: null
            })
        }
        const hashedPassword = await bcrypt.hash(password, 10);
        // 2️⃣ Insert ke customer
        const sqlInsert = `
        INSERT INTO customer 
        (fullname_customer, email_customer, pnumber_customer, username_customer, password_customer)
        VALUES (?, ?, ?, ?, ?)
        `;
        await db.query(sqlInsert, [fullname, email, pnumber, username, hashedPassword]);

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
        // 1️⃣ cek admin dulu
        const sqlAdmin = "SELECT * FROM admin WHERE username_admin=?";
        const [adminResult] = await db.query(sqlAdmin, [username]);

        if (adminResult.length > 0) {
            const admin = adminResult[0];

            const isMatch = await bcrypt.compare(password, admin.password_admin);
            if (!isMatch) {
                return res.render("login", { error: "Username atau Password salah!" });
            }

            req.session.user = admin;
            req.session.role = "admin";
            return res.redirect("/");
        }

        // 2️⃣ cek customer
        const sqlCustomer = "SELECT * FROM customer WHERE username_customer=?";
        const [custResult] = await db.query(sqlCustomer, [username]);

        if (custResult.length > 0) {
            const customer = custResult[0];

            const isMatch = await bcrypt.compare(password, customer.password_customer);
            if (!isMatch) {
                return res.render("login", { error: "Username atau Password salah!" });
            }

            req.session.user = customer;
            req.session.role = "customer";
            return res.redirect("/");
        }

        // 3️⃣ user ga ketemu
        res.render("login", { error: "Username atau Password salah!" });

    } catch (err) {
        console.error("❌ Database error:", err);
        res.status(500).send("Server error");
    }
});

module.exports = router;
