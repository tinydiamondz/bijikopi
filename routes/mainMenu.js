const express = require("express");
const router = express.Router();
const db = require("../connect"); // pool.promise()

// Middleware cek login
function checkLogin(req, res, next) {
    if (req.session.user && req.session.role) {
        next();
    } else {
        res.redirect("/login");
    }
}

// MAIN PAGE
router.get("/", checkLogin, async (req, res) => {
    const role = req.session.role;
    const user = req.session.user;

    try {
        const [rows] = await db.query(
            `SELECT qty_point FROM point WHERE id_customer = ?`,
            [user.id_customer]
        );

        const point = rows.length > 0 ? rows[0].qty_point : 0;

        res.render("main-menu", { role, user, point });

    } catch (err) {
        console.error("Error fetching points:", err);
        res.render("main-menu", { role, user, point: 0 });
    }
});



// FOODS 
// === GET: tampilkan halaman awal ===
router.get("/foods", checkLogin, async (req, res) => {
    const role = req.session.role;
    const user = req.session.user;

    try {
        const [foods] = await db.query("SELECT * FROM food");

        const [rows] = await db.query(
            `SELECT qty_point FROM point WHERE id_customer = ?`,
            [user.id_customer]
        );

        const point = rows.length > 0 ? rows[0].qty_point : 0;

        res.render("foods", {
            role,
            user,
            foods,
            added: 0,
            point
        });

    } catch (err) {
        console.error("❌ Database error:", err);
        res.status(500).send("Server error");
    }
});

// === POST: setelah berhasil tambah ke cart ===
router.post("/foods", checkLogin, async (req, res) => {
    try {
        const id_customer = req.session.user.id_customer;

        // Ambil data food
        const [results] = await db.query("SELECT * FROM food");

        // Ambil point user
        const [rows] = await db.query(
            `SELECT qty_point FROM point WHERE id_customer = ?`,
            [id_customer]
        );

        const point = rows.length > 0 ? rows[0].qty_point : 0;

        res.render("foods", {
            role: req.session.role,
            user: req.session.user,
            foods: results,
            added: 1, // trigger alert
            point
        });

    } catch (err) {
        console.error("❌ Database error:", err);
        res.status(500).send("Server error");
    }
});

// DRINKS page
router.get("/drinks", checkLogin, async (req, res) => {
    try {
        const user = req.session.user;

        // Ambil semua minuman
        const sql = "SELECT * FROM drink";
        const [results] = await db.query(sql);

        // Ambil point customer
        const [rows] = await db.query(
            `SELECT qty_point FROM point WHERE id_customer = ?`,
            [user.id_customer]
        );

        const point = rows.length > 0 ? rows[0].qty_point : 0;

        res.render("drinks", {
            role: req.session.role,
            user,
            drinks: results,
            added: 0,
            point
        });
    } catch (err) {
        console.error("❌ Database error:", err);
        res.status(500).send("Server error");
    }
});


// ===== POST /drinks (tampil + alert sukses) =====
router.post("/drinks", checkLogin, async (req, res) => {
    try {
        const id_customer = req.session.user.id_customer;

        // Ambil semua minuman
        const [results] = await db.query("SELECT * FROM drink");

        // Ambil point user
        const [rows] = await db.query(
            `SELECT qty_point FROM point WHERE id_customer = ?`,
            [id_customer]
        );

        const point = rows.length ? rows[0].qty_point : 0;

        // Render halaman drinks + kirim point
        res.render("drinks", {
            role: req.session.role,
            user: req.session.user,
            drinks: results,
            added: 1, // trigger alert
            point
        });

    } catch (err) {
        console.error("❌ Database error:", err);
        res.status(500).send("Server error");
    }
});

// ------------------ CART ------------------

// Add to cart
router.post("/add-to-cart", checkLogin, async (req, res) => {
    const { id, type } = req.body; // 'food' atau 'drink'
    const id_customer = req.session.user.id_customer;

    try {
        let sqlItem;
        if (type === "food") sqlItem = "SELECT * FROM food WHERE id_food=?";
        else sqlItem = "SELECT * FROM drink WHERE id_drink=?";

        const [result] = await db.query(sqlItem, [id]);
        if (result.length === 0) return res.send("Menu tidak ditemukan");

        const item = result[0];
        const name_cart = type === "food" ? item.name_food : item.name_drink;
        const price = type === "food" ? item.price_food : item.price_drink;
        const id_food = type === "food" ? id : null;
        const id_drink = type === "drink" ? id : null;

        // cek apakah item sudah ada di cart
        let sqlCheck = `
            SELECT * FROM cart 
            WHERE id_customer=? AND id_food ${id_food ? "=?" : "IS NULL"} 
                              AND id_drink ${id_drink ? "=?" : "IS NULL"}
        `;
        let paramsCheck = [id_customer];
        if (id_food) paramsCheck.push(id_food);
        if (id_drink) paramsCheck.push(id_drink);

        const [results2] = await db.query(sqlCheck, paramsCheck);

        const afterUpdateOrInsert = async () => {
            const sqlList = type === "food" ? "SELECT * FROM food" : "SELECT * FROM drink";
            const [listResults] = await db.query(sqlList);
        
            // AMBIL POINT USER
            const id_customer = req.session.user.id_customer;
            const [rows] = await db.query(
                "SELECT qty_point FROM point WHERE id_customer = ?",
                [id_customer]
            );
            const point = rows.length > 0 ? rows[0].qty_point : 0;
        
            res.render(type === "food" ? "foods" : "drinks", {
                role: req.session.role,
                user: req.session.user,
                [type === "food" ? "foods" : "drinks"]: listResults,
                added: 1,
                point   // <=== WAJIB!
            });
        };

        if (results2.length > 0) {
            // sudah ada -> update qty dan total
            const currentQty = results2[0].qty_cart;
            const newQty = currentQty + 1;
            const newTotal = price * newQty;

            const sqlUpdate = `
                UPDATE cart 
                SET qty_cart=?, total_cart=? 
                WHERE id_cart=?
            `;
            await db.query(sqlUpdate, [newQty, newTotal, results2[0].id_cart]);
            await afterUpdateOrInsert();
        } else {
            // belum ada -> insert baru
            const sqlInsert = `
                INSERT INTO cart (name_cart, qty_cart, total_cart, id_drink, id_food, id_customer)
                VALUES (?, 1, ?, ?, ?, ?)
            `;
            await db.query(sqlInsert, [name_cart, price, id_drink, id_food, id_customer]);
            await afterUpdateOrInsert();
        }
    } catch (err) {
        console.error("❌ Database error:", err);
        res.status(500).send("Server error");
    }
});



// Tampilkan cart
router.get("/cart", checkLogin, async (req, res) => {
    const user = req.session.user;
    const id_customer = user.id_customer;

    const sql = `
        SELECT c.*, f.price_food, d.price_drink 
        FROM cart c
        LEFT JOIN food f ON c.id_food = f.id_food
        LEFT JOIN drink d ON c.id_drink = d.id_drink
        WHERE c.id_customer=?
    `;
    const sqlTotal = `SELECT SUM(total_cart) AS total_price FROM cart WHERE id_customer=?`;

    try {
        const [results] = await db.query(sql, [id_customer]);
        const [resultTotal] = await db.query(sqlTotal, [id_customer]);
        const totalPrice = resultTotal[0].total_price || 0;

        // Ambil point terbaru
        const [rows] = await db.query(
            `SELECT qty_point FROM point WHERE id_customer=?`,
            [id_customer]
        );

        const point = rows.length > 0 ? rows[0].qty_point : 0;

        res.render("cart", {
            role: req.session.role,
            user,
            cart: results,
            totalPrice,
            point
        });

    } catch (err) {
        console.error("❌ Database error:", err);
        res.status(500).send("Server error");
    }
});

// Remove 1 item / delete if qty = 1
router.post("/cart/remove", checkLogin, async (req, res) => {
    const { id_cart } = req.body;

    try {
        // cek qty_cart dulu
        const sqlCheck = "SELECT qty_cart, total_cart FROM cart WHERE id_cart=?";
        const [results] = await db.query(sqlCheck, [id_cart]);
        if (results.length === 0) return res.redirect("/cart");

        const { qty_cart, total_cart } = results[0];

        if (qty_cart > 1) {
            // update qty dan total
            const pricePerItem = total_cart / qty_cart;
            const newQty = qty_cart - 1;
            const newTotal = pricePerItem * newQty;

            const sqlUpdate = "UPDATE cart SET qty_cart=?, total_cart=? WHERE id_cart=?";
            await db.query(sqlUpdate, [newQty, newTotal, id_cart]);
            res.redirect("/cart");
        } else {
            // qty = 1, hapus row
            const sqlDelete = "DELETE FROM cart WHERE id_cart=?";
            await db.query(sqlDelete, [id_cart]);
            res.redirect("/cart");
        }
    } catch (err) {
        console.error("❌ Database error:", err);
        res.status(500).send("Server error");
    }
});


// ke payment page
router.post("/payment", checkLogin, async (req, res) => {
    const id_customer = req.session.user.id_customer;
    let selected = req.body.selected; // array id_cart dari checkbox

    if (!selected) {
        return res.send("<script>alert('Pilih minimal 1 item untuk checkout!'); window.location.href='/cart';</script>");
    }

    // pastikan selectedItems selalu array
    const selectedItems = Array.isArray(selected) ? selected : [selected];

    try {
        // Query cart items yang dipilih
        const sql = `SELECT * FROM cart WHERE id_customer = ? AND id_cart IN (?)`;
        const [items] = await db.query(sql, [id_customer, selectedItems]);

        if (items.length === 0) {
            return res.send("<script>alert('Tidak ada item ditemukan!'); window.location.href='/cart';</script>");
        }

        // Buat objek transaction sementara
        const transaction = {
            id_transaction: selectedItems[0], // bisa pakai id_cart pertama sebagai id sementara
            name_transaction: items.map(i => i.name_cart).join(', '),
            total_transaction: items.reduce((acc, item) => acc + item.total_cart, 0)
        };

        // Render payment page
        res.render("payment", {
            user: req.session.user,
            items,
            transaction // <-- penting supaya EJS tidak error
        });
    } catch (err) {
        console.error("❌ Database error:", err);
        res.status(500).send("Server error");
    }
});

// checkout
// ===================== CHECKOUT CONFIRM =====================
router.post("/confirm", checkLogin, async (req, res) => {
    const id_customer = req.session.user.id_customer;
    const selectedItems = req.body.selected;
    const paymentMethod = req.body.payment_method;

    try {
        // Ambil item dari cart untuk customer ini
        const sqlCart = `
            SELECT * FROM cart 
            WHERE id_customer = ? AND id_cart IN (?)
        `;
        const [carts] = await db.query(sqlCart, [id_customer, selectedItems]);

        if (carts.length === 0) {
            return res.send("<script>alert('Cart kosong atau tidak ditemukan!'); window.location.href='/cart';</script>");
        }

        // Simpan sementara data rating yang bisa diakses di route /rating
        req.session.canRate = {
            id_customer,
            cart_ids: carts.map(c => c.id_cart),
            payment_method: paymentMethod,
            items: carts
        };

        // Redirect langsung ke halaman rating
        res.redirect("/rating");
    } catch (err) {
        console.error("❌ Database error:", err);
        res.status(500).send("Server error");
    }
});

// RATING page
router.get("/rating", checkLogin, (req, res) => {
    const { items, payment_method } = req.session.canRate || {};
    if (!items) {
        return res.send("<script>alert('Tidak ada data untuk rating!'); window.location.href='/cart';</script>");
    }

    res.render("rating", {
        user: req.session.user,
        items,
        payment_method
    });
});

// TRANSACTIONS page (history pembayaran)
router.get("/transactions", checkLogin, async (req, res) => {
    const id_customer = req.session.user.id_customer;

    try {
        // GET POINT
        const [rows] = await db.query(
            `SELECT qty_point FROM point WHERE id_customer = ?`,
            [id_customer]
        );
        const point = rows.length ? rows[0].qty_point : 0;

        // GET TRANSACTIONS
        const [transactions] = await db.query(
            `SELECT * 
             FROM transaction 
             WHERE id_customer = ? 
             ORDER BY date_transaction DESC`,
            [id_customer]
        );

        const allItems = [];
        let totalHistory = 0;

        // PARSE TRANSAKSI
        transactions.forEach(tr => {
            const names = tr.menu_transaction.split(',').map(n => n.trim());
            const qtys = tr.qty_transaction.split(',').map(q => Number(q.trim()));
            const subtotals = tr.subtotal_transaction.split(',').map(s => Number(s.trim()));

            totalHistory += subtotals.reduce((a, b) => a + b, 0);

            names.forEach((name, i) => {
                allItems.push({
                    name_cart: name,
                    qty_cart: qtys[i] || 1,
                    total_cart: subtotals[i] || 0,
                    date_transaction: tr.date_transaction,
                    paymentMethod_transaction: tr.paymentMethod_transaction || "-"
                });
            });
        });

        // RENDER
        res.render("transaction", {
            user: req.session.user,
            role: req.session.role,
            allItems,
            totalHistory,
            point
        });

    } catch (err) {
        console.error("❌ Database error:", err);
        res.status(500).send("Server error");
    }
});


// ===================== RATING PAGE =====================
router.get("/rating/:id_transaction", checkLogin, async (req, res) => {
    const id_transaction = req.params.id_transaction;
    const id_customer = req.session.user.id_customer;

    try {

        // ============================
        // AMBIL POINT USER
        // ============================
        const [rows] = await db.query(
            `SELECT qty_point FROM point WHERE id_customer = ?`,
            [id_customer]
        );
        const point = rows.length > 0 ? rows[0].qty_point : 0;

        // ============================
        // AMBIL TRANSAKSI
        // ============================
        const [trans] = await db.query(
            `SELECT * FROM transaction WHERE id_transaction = ? AND id_customer = ?`,
            [id_transaction, id_customer]
        );

        if (trans.length === 0) {
            return res.send("<script>alert('Transaksi tidak ditemukan!'); window.location.href='/transactions';</script>");
        }

        if (trans[0].is_rated) {
            return res.send("<script>alert('Transaksi sudah dirating!'); window.location.href='/transactions';</script>");
        }

        // ============================
        // AMBIL CART YANG TERKAIT
        // ============================
        const [carts] = await db.query(
            `SELECT * FROM cart WHERE id_customer = ? AND created_at <= ?`,
            [id_customer, trans[0].date_transaction]
        );

        if (carts.length === 0) {
            return res.send("<script>alert('Cart tidak ditemukan untuk rating!'); window.location.href='/transactions';</script>");
        }

        // Izinkan rating
        req.session.canRate = { 
            id_transaction, 
            cart_ids: carts.map(c => c.id_cart) 
        };

        // ============================
        // RENDER PAGE (KIRIM POINT!)
        // ============================
        res.render("rating", {
            user: req.session.user,
            transaction: trans[0],
            items: carts,
            point  // <===== dikirim ke EJS
        });

    } catch (err) {
        console.error("❌ Database error:", err);
        res.status(500).send("Server error");
    }
});


// ===================== POST RATING SUBMIT =====================
router.post("/rating/submit", checkLogin, async (req, res) => {
    const id_customer = req.session.user.id_customer;
    const { cart_ids, payment_method, items } = req.session.canRate || {};
    const { ratings, comment_rating, isSkip } = req.body;

    if (!cart_ids || !items) {
        return res.json({ success: false, message: "Data rating tidak valid!" });
    }

    // Helper tambah poin
    async function addPoints(id_customer, amount) {
        const [rows] = await db.query(
            `SELECT qty_point FROM point WHERE id_customer = ?`,
            [id_customer]
        );

        if (rows.length === 0) {
            await db.query(
                `INSERT INTO point (qty_point, id_customer) VALUES (?, ?)`,
                [amount, id_customer]
            );
        } else {
            const newTotal = rows[0].qty_point + amount;
            await db.query(
                `UPDATE point SET qty_point = ? WHERE id_customer = ?`,
                [newTotal, id_customer]
            );
        }
    }

    const menuNames = items.map(c => c.name_cart).join(', ');
    const qtys = items.map(c => c.qty_cart).join(',');
    const subtotals = items.map(c => c.total_cart).join(',');
    const total = items.reduce((acc, c) => acc + c.total_cart, 0);

    try {
        // INSERT TRANSACTION
        const [result] = await db.query(
            `INSERT INTO transaction 
            (id_customer, menu_transaction, qty_transaction, subtotal_transaction, paymentMethod_transaction, total_transaction, date_transaction)
            VALUES (?, ?, ?, ?, ?, ?, NOW())`,
            [id_customer, menuNames, qtys, subtotals, payment_method, total]
        );

        const id_transaction = result.insertId;

        if (!isSkip) {
            // INSERT RATING
            const [result2] = await db.query(
                `INSERT INTO rating (id_transaction, id_customer, comment_rating, date_rating)
                 VALUES (?, ?, ?, NOW())`,
                [id_transaction, id_customer, comment_rating]
            );

            // Tambah poin
            await addPoints(id_customer, 10);
            console.log(`Customer ${id_customer} mendapat 10 poin`);

            const id_rating = result2.insertId;

            // INSERT RATING DETAIL
            const ratingDetails = ratings.map(r => [
                id_rating,
                r.name_cart,
                null,
                null,
                r.qty,
                r.value_rating
            ]);

            await db.query(
                `INSERT INTO rating_detail 
                (id_rating, menu_rating_detail, id_food, id_drink, qty_rating_detail, value_rating_detail)
                VALUES ?`,
                [ratingDetails]
            );
        } else {
            // Skip rating tapi tetap tambah poin
            await addPoints(id_customer, 10);
        }

        // Kurangi stok
        for (const c of items) {
            if (c.id_food) {
                await db.query(
                    `UPDATE food SET qty_food = qty_food - ? WHERE id_food = ?`,
                    [c.qty_cart, c.id_food]
                );
            } else if (c.id_drink) {
                await db.query(
                    `UPDATE drink SET qty_drink = qty_drink - ? WHERE id_drink = ?`,
                    [c.qty_cart, c.id_drink]
                );
            }
        }

        // Hapus cart
        await db.query(`DELETE FROM cart WHERE id_cart IN (?)`, [cart_ids]);

        // Reset session
        req.session.canRate = null;

        return res.json({ success: true });

    } catch (err) {
        console.error("❌ Database error:", err);
        return res.json({ success: false, message: "Server error" });
    }
});





// ===================== FORUM// ===================== 
router.get("/forum", checkLogin, async (req, res) => {
    const id_customer = req.session.user.id_customer;

    try {

        // =============================
        // 1. AMBIL POINT USER
        // =============================
        const [rows] = await db.query(
            `SELECT qty_point FROM point WHERE id_customer = ?`,
            [id_customer]
        );
        const point = rows.length > 0 ? rows[0].qty_point : 0;

        // =============================
        // 2. AMBIL DATA RATING FORUM
        // =============================
        const sql = `
            SELECT r.id_rating, r.date_rating, r.comment_rating,
                   rd.menu_rating_detail, rd.qty_rating_detail, rd.value_rating_detail,
                   c.fullname_customer
            FROM rating r
            JOIN rating_detail rd ON r.id_rating = rd.id_rating
            JOIN customer c ON r.id_customer = c.id_customer
            ORDER BY r.date_rating DESC
        `;

        const [results] = await db.query(sql);

        const ratingsMap = {};

        results.forEach(row => {
            if (!ratingsMap[row.id_rating]) {
                ratingsMap[row.id_rating] = {
                    id_rating: row.id_rating,
                    date_rating: row.date_rating,
                    fullname_customer: row.fullname_customer,
                    comment_rating: row.comment_rating || "Tidak ada komentar.",
                    purchasedItems: []
                };
            }

            ratingsMap[row.id_rating].purchasedItems.push({
                name: row.menu_rating_detail,
                qty: row.qty_rating_detail,
                value_rating: row.value_rating_detail
            });
        });

        const ratings = Object.values(ratingsMap);

        // =============================
        // 3. RENDER + KIRIM POINT KE EJS
        // =============================
        res.render("forum", {
            user: req.session.user,
            role: req.session.role,
            ratings,
            point
        });

    } catch (err) {
        console.error("❌ Database error:", err);
        res.status(500).send("Server error");
    }
});

// ===================== LOGOUT =====================
router.get("/logout", (req, res) => {
    req.session.destroy(err => {
        if (err) {
            console.error("❌ Logout error:", err);
            return res.status(500).send("Server error");
        }
        res.redirect("/"); // setelah logout, kembali ke halaman utama
    });
});

module.exports = router;
