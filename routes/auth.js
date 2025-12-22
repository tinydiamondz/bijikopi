const express = require("express");  
const router = express.Router();
const db = require("../connect"); // pool.promise()
const session = require("express-session"); 
const bcrypt = require("bcrypt");

//TAMPIL REGISTER
router.get("/register", (req, res) => {
    res.render("register", {
        error: null,
        success: null,
        old: req.session.old || {}
    });
    req.session.old = null;
});

//REGISTER
router.post("/register", async (req, res) => {
    console.log("=== REGISTER START ===");
    console.log("REQ BODY:", req.body);

    const { fullname, email, pnumber, username, password, retypepassword } = req.body;

    // SIMPAN INPUT LAMA (KECUALI PASSWORD)
    req.session.old = { fullname, email, pnumber, username };

    try {
        const sqlCheck = `
            SELECT username_customer AS username, email_customer AS email FROM customer 
            WHERE username_customer = ? OR email_customer = ?
            UNION
            SELECT username_admin AS username, email_admin AS email FROM admin 
            WHERE username_admin = ? OR email_admin = ?
        `;

        const [results] = await db.query(sqlCheck, [username, email, username, email]);

        if (results.length > 0) {
            const usernameUsed = results.some(r => r.username === username);
            if (usernameUsed) {
                req.session.old.username = "";
            }

            return res.render("register", {
                error: "Username or email is already taken!",
                success: null,
                old: req.session.old
            });
        }

        if (retypepassword != password) {
            return res.render("register", {
                error: "Password doesn't matches!",
                success: null,
                old: req.session.old
            });
        }

        const hashedPassword = await bcrypt.hash(password, 10);

        await db.query(`
            INSERT INTO customer 
            (fullname_customer, email_customer, pnumber_customer, username_customer, password_customer)
            VALUES (?, ?, ?, ?, ?)
        `, [fullname, email, pnumber, username, hashedPassword]);

        // ✅ TAMBAHAN SAJA DI SINI
        req.session.old = null;
        req.session.success = "Akun Berhasil Dibuat";

        return res.redirect("/login");

    } catch (err) {
        console.error("❌ REGISTER ERROR:", err);
        res.render("register", {
            error: "Terjadi kesalahan server!",
            success: null,
            old: req.session.old
        });
    }
});

//LOGIN 
router.get("/login", (req, res) => {
    const success = req.session.success || null;
    req.session.success = null; // flash (hapus setelah tampil)

    res.render("login", {
        error: null,
        success
    });
});

router.post("/login", async (req, res) => {
    const { username, password } = req.body;

    if (!username || !password) {
        return res.render("login", { error: "Username & Password harus diisi!" });
    }

    try {
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

        res.render("login", { error: "Username atau Password salah!" });

    } catch (err) {
        console.error("❌ LOGIN ERROR:", err);
        res.status(500).send("Server error");
    }
});
