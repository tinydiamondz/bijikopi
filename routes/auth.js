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
    console.log("=== REGISTER START ===");
    console.log("REQ BODY:", req.body);

    const { fullname, email, pnumber, username, password, retypepassword } = req.body;

    console.log("USERNAME:", username);
    console.log("PASSWORD RAW:", password);
    console.log("RETYPE:", retypepassword);

    try {
        const sqlCheck = `
            SELECT username_customer AS username, email_customer AS email FROM customer 
            WHERE username_customer = ? OR email_customer = ?
            UNION
            SELECT username_admin AS username, email_admin AS email FROM admin 
            WHERE username_admin = ? OR email_admin = ?
        `;

        const [results] = await db.query(sqlCheck, [username, email, username, email]);
        console.log("CHECK RESULT:", results);

        if (results.length > 0) {
            console.log("USERNAME / EMAIL ALREADY EXISTS");
            return res.render("register", {
                error: "Username or email is already taken!",
                success: null
            });
        }

        if (retypepassword != password) {
            console.log("PASSWORD NOT MATCH");
            return res.render("register", {
                error: "Password doesn't matches!",
                success: null
            });
        }

        const hashedPassword = await bcrypt.hash(password, 10);
        console.log("HASHED PASSWORD:", hashedPassword);

        const sqlInsert = `
        INSERT INTO customer 
        (fullname_customer, email_customer, pnumber_customer, username_customer, password_customer)
        VALUES (?, ?, ?, ?, ?)
        `;

        await db.query(sqlInsert, [
            fullname,
            email,
            pnumber,
            username,
            hashedPassword
        ]);

        console.log("REGISTER SUCCESS");
        console.log("=== REGISTER END ===");

        res.render("register", {
            success: "✅ Akun berhasil didaftarkan!",
            error: null
        });

    } catch (err) {
        console.error("❌ REGISTER ERROR:", err);
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
    console.log("=== LOGIN START ===");
    console.log("REQ BODY:", req.body);

    const { username, password } = req.body;
    console.log("USERNAME INPUT:", username);
    console.log("PASSWORD INPUT:", password);

    if (!username || !password) {
        console.log("EMPTY INPUT");
        return res.render("login", { error: "Username & Password harus diisi!" });
    }

    try {
        const sqlAdmin = "SELECT * FROM admin WHERE username_admin=?";
        const [adminResult] = await db.query(sqlAdmin, [username]);
        console.log("ADMIN RESULT:", adminResult);

        if (adminResult.length > 0) {
            const admin = adminResult[0];
            console.log("ADMIN HASH:", admin.password_admin);

            const isMatch = await bcrypt.compare(password, admin.password_admin);
            console.log("ADMIN COMPARE:", isMatch);

            if (!isMatch) {
                return res.render("login", { error: "Username atau Password salah!" });
            }

            req.session.user = admin;
            req.session.role = "admin";
            console.log("LOGIN AS ADMIN SUCCESS");
            return res.redirect("/");
        }

        const sqlCustomer = "SELECT * FROM customer WHERE username_customer=?";
        const [custResult] = await db.query(sqlCustomer, [username]);
        console.log("CUSTOMER RESULT:", custResult);

        if (custResult.length > 0) {
            const customer = custResult[0];
            console.log("CUSTOMER HASH:", customer.password_customer);

            const isMatch = await bcrypt.compare(password, customer.password_customer);
            console.log("CUSTOMER COMPARE:", isMatch);

            if (!isMatch) {
                console.log("PASSWORD WRONG");
                return res.render("login", { error: "Username atau Password salah!" });
            }

            req.session.user = customer;
            req.session.role = "customer";
            console.log("LOGIN AS CUSTOMER SUCCESS");
            console.log("=== LOGIN END ===");
            return res.redirect("/");
        }

        console.log("USER NOT FOUND");
        res.render("login", { error: "Username atau Password salah!" });

    } catch (err) {
        console.error("❌ LOGIN ERROR:", err);
        res.status(500).send("Server error");
    }
});

module.exports = router;
