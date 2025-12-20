const express = require("express");
const router = express.Router();
const db = require("../connect"); 

// --- [DATABASE SEMENTARA - RAM] ---
// Mencatat user yang sudah klaim voucher hari ini
const dailyClaimHistory = new Set();

// Middleware cek login
function checkLogin(req, res, next) {
    if (req.session.user && req.session.role) {
        next();
    } else {
        res.redirect("/login");
    }
}

// --- HELPER FUNCTIONS ---
function isSaturday() {
    const today = new Date();
    return today.getDay() === 6; // 6 = Sabtu
}

function getTodayString() {
    const d = new Date();
    return d.toISOString().split('T')[0]; 
}

function getCurrentDateTimeWIB() {
    const now = new Date();
    const options = { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' };
    return now.toLocaleDateString('id-ID', options);
}

// ===================== MAIN PAGE =====================
router.get("/", checkLogin, async (req, res) => {
    const role = req.session.role;
    const user = req.session.user;

    try {
        const [rows] = await db.query(`SELECT qty_point FROM point WHERE id_customer = ?`, [user.id_customer]);
        const point = rows.length > 0 ? rows[0].qty_point : 0;

        // Cek Status Voucher Sabtu
        const claimKey = `${getTodayString()}_${user.id_customer}`;
        const hasClaimed = dailyClaimHistory.has(claimKey);
        const todayIsSaturday = isSaturday();

        if (todayIsSaturday && hasClaimed) {
            req.session.voucherActive = true;
        } else {
            if (!hasClaimed) req.session.voucherActive = false;
        }

        res.render("main-menu", { 
            role, user, point, 
            currentDateWIB: getCurrentDateTimeWIB(),
            page: 'main',
            isSaturday: todayIsSaturday,
            hasClaimed: hasClaimed
        });

    } catch (err) {
        console.error("Error:", err);
        res.render("main-menu", { role, user, point: 0, currentDateWIB: getCurrentDateTimeWIB(), page: 'main', isSaturday: false, hasClaimed: false });
    }
});

// ===================== API: KLAIM VOUCHER =====================
router.post("/claim-voucher", checkLogin, (req, res) => {
    const id_customer = req.session.user.id_customer;
    if (!isSaturday()) return res.json({ success: false, message: "Voucher hanya tersedia hari Sabtu!" });

    const claimKey = `${getTodayString()}_${id_customer}`;
    if (dailyClaimHistory.has(claimKey)) return res.json({ success: false, message: "Anda sudah klaim hari ini." });

    dailyClaimHistory.add(claimKey);
    req.session.voucherActive = true;

    return res.json({ success: true, message: "Voucher berhasil diklaim!" });
});

// ===================== FOODS & DRINKS PAGES =====================
router.get("/foods", checkLogin, async (req, res) => {
    const user = req.session.user;
    try {
        const [foods] = await db.query("SELECT * FROM food");
        const [rows] = await db.query(`SELECT qty_point FROM point WHERE id_customer = ?`, [user.id_customer]);
        const point = rows.length > 0 ? rows[0].qty_point : 0;
        res.render("foods", { role: req.session.role, user, foods, added: 0, point, page: 'foods' });
    } catch (err) { res.status(500).send("Server error"); }
});

router.post("/foods", checkLogin, async (req, res) => {
    try {
        const user = req.session.user;
        const [results] = await db.query("SELECT * FROM food");
        const [rows] = await db.query(`SELECT qty_point FROM point WHERE id_customer = ?`, [user.id_customer]);
        const point = rows.length > 0 ? rows[0].qty_point : 0;
        res.render("foods", { role: req.session.role, user, foods: results, added: 1, point, page: 'foods' });
    } catch (err) { res.status(500).send("Server error"); }
});

router.get("/drinks", checkLogin, async (req, res) => {
    const user = req.session.user;
    try {
        const [results] = await db.query("SELECT * FROM drink");
        const [rows] = await db.query(`SELECT qty_point FROM point WHERE id_customer = ?`, [user.id_customer]);
        const point = rows.length > 0 ? rows[0].qty_point : 0;
        res.render("drinks", { role: req.session.role, user, drinks: results, added: 0, point, page: 'drinks' });
    } catch (err) { res.status(500).send("Server error"); }
});

router.post("/drinks", checkLogin, async (req, res) => {
    try {
        const user = req.session.user;
        const [results] = await db.query("SELECT * FROM drink");
        const [rows] = await db.query(`SELECT qty_point FROM point WHERE id_customer = ?`, [user.id_customer]);
        const point = rows.length ? rows[0].qty_point : 0;
        res.render("drinks", { role: req.session.role, user, drinks: results, added: 1, point, page: 'drinks' });
    } catch (err) { res.status(500).send("Server error"); }
});

// ===================== CART SYSTEM =====================
router.post("/add-to-cart", checkLogin, async (req, res) => {
    const { id, type } = req.body; 
    const id_customer = req.session.user.id_customer;

    try {
        let sqlItem = type === "food" ? "SELECT * FROM food WHERE id_food=?" : "SELECT * FROM drink WHERE id_drink=?";
        const [result] = await db.query(sqlItem, [id]);
        if (result.length === 0) return res.send("Menu tidak ditemukan");

        const item = result[0];
        const name_cart = type === "food" ? item.name_food : item.name_drink;
        const price = type === "food" ? item.price_food : item.price_drink;
        const id_food = type === "food" ? id : null;
        const id_drink = type === "drink" ? id : null;

        let sqlCheck = `SELECT * FROM cart WHERE id_customer=? AND id_food ${id_food ? "=?" : "IS NULL"} AND id_drink ${id_drink ? "=?" : "IS NULL"}`;
        let paramsCheck = [id_customer];
        if (id_food) paramsCheck.push(id_food);
        if (id_drink) paramsCheck.push(id_drink);

        const [results2] = await db.query(sqlCheck, paramsCheck);

        const afterUpdateOrInsert = async () => {
            const sqlList = type === "food" ? "SELECT * FROM food" : "SELECT * FROM drink";
            const [listResults] = await db.query(sqlList);
            const [rows] = await db.query("SELECT qty_point FROM point WHERE id_customer = ?", [id_customer]);
            const point = rows.length > 0 ? rows[0].qty_point : 0;

            res.render(type === "food" ? "foods" : "drinks", {
                role: req.session.role,
                user: req.session.user,
                [type === "food" ? "foods" : "drinks"]: listResults,
                added: 1,
                point,
                page: 'cart'
            });
        };

        if (results2.length > 0) {
            const newQty = results2[0].qty_cart + 1;
            const newTotal = price * newQty;
            await db.query(`UPDATE cart SET qty_cart=?, total_cart=? WHERE id_cart=?`, [newQty, newTotal, results2[0].id_cart]);
            await afterUpdateOrInsert();
        } else {
            await db.query(`INSERT INTO cart (name_cart, qty_cart, total_cart, id_drink, id_food, id_customer) VALUES (?, 1, ?, ?, ?, ?)`, 
                [name_cart, price, id_drink, id_food, id_customer]);
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

        let discount = 0;
        let finalPrice = totalPrice;

        // Diskon Voucher Sabtu (Visual Only di Cart)
        if (req.session.voucherActive) {
            discount = totalPrice * 0.20; 
            finalPrice = totalPrice - discount;
        }

        const [rows] = await db.query(`SELECT qty_point FROM point WHERE id_customer=?`, [id_customer]);
        const point = rows.length > 0 ? rows[0].qty_point : 0;

        res.render("cart", { 
            role: req.session.role, 
            user, cart: results, totalPrice, point, page: 'cart',
            discount, finalPrice
        });
    } catch (err) { res.status(500).send("Server error"); }
});

router.post("/cart/remove", checkLogin, async (req, res) => {
    const { id_cart } = req.body;
    try {
        const [results] = await db.query("SELECT qty_cart, total_cart FROM cart WHERE id_cart=?", [id_cart]);
        if (results.length === 0) return res.redirect("/cart");

        const { qty_cart, total_cart } = results[0];
        if (qty_cart > 1) {
            const pricePerItem = total_cart / qty_cart;
            const newQty = qty_cart - 1;
            const newTotal = pricePerItem * newQty;
            await db.query("UPDATE cart SET qty_cart=?, total_cart=? WHERE id_cart=?", [newQty, newTotal, id_cart]);
        } else {
            await db.query("DELETE FROM cart WHERE id_cart=?", [id_cart]);
        }
        res.redirect("/cart");
    } catch (err) { res.status(500).send("Server error"); }
});

// ===================== PAYMENT =====================
router.post("/payment", checkLogin, async (req, res) => {
    const id_customer = req.session.user.id_customer;
    let selected = req.body.selected; 

    if (!selected) return res.send("<script>alert('Pilih minimal 1 item!'); window.location.href='/cart';</script>");
    const selectedItems = Array.isArray(selected) ? selected : [selected];

    try {
        const sql = `SELECT * FROM cart WHERE id_customer = ? AND id_cart IN (?)`;
        const [items] = await db.query(sql, [id_customer, selectedItems]);

        if (items.length === 0) return res.send("<script>alert('Item tidak ditemukan!'); window.location.href='/cart';</script>");

        let total = items.reduce((acc, item) => acc + item.total_cart, 0);
        let discount = 0;

        // Cek Diskon Voucher Sabtu
        if (req.session.voucherActive) {
            discount = total * 0.20;
            total = total - discount;
        }

        const transaction = {
            id_transaction: selectedItems[0], 
            name_transaction: items.map(i => i.name_cart).join(', '),
            total_transaction: total, 
            discount_amount: discount
        };

        const [userPoints] = await db.query("SELECT qty_point FROM point WHERE id_customer = ?", [id_customer]);
        const point = userPoints.length > 0 ? userPoints[0].qty_point : 0;

        res.render("payment", {
            user: req.session.user,
            items,
            transaction,
            point // Kirim point agar bisa dicek di checkbox redeem
        });
    } catch (err) { res.status(500).send("Server error"); }
});

// ===================== CONFIRM CHECKOUT =====================
router.post("/confirm", checkLogin, async (req, res) => {
    const id_customer = req.session.user.id_customer;
    let selectedItems = req.body.selected;

    if (!selectedItems) {
        return res.send("<script>alert('Tidak ada item dipilih');window.location.href='/cart'</script>");
    }

    // 🔥 PAKSA ARRAY
    selectedItems = Array.isArray(selectedItems) ? selectedItems : [selectedItems];

    const paymentMethod = req.body.payment_method;
    const usePoints = req.body.use_points;

    const [carts] = await db.query(
        `SELECT * FROM cart WHERE id_customer=? AND id_cart IN (?)`,
        [id_customer, selectedItems]
    );

    req.session.canRate = {
        id_customer,
        cart_ids: selectedItems, // 🔥 PENTING
        payment_method: paymentMethod,
        items: carts,
        use_points: usePoints
    };

    res.redirect("/rating");
});

router.get("/rating", checkLogin, (req, res) => {
    const { items, payment_method } = req.session.canRate || {};
    if (!items) return res.send("<script>alert('Tidak ada data!'); window.location.href='/cart';</script>");
    res.render("rating", { user: req.session.user, items, payment_method });
});

// ===================== SUBMIT TRANSAKSI FINAL (LOGIKA UTAMA) =====================
router.post("/rating/submit", checkLogin, async (req, res) => {
    const id_customer = req.session.user.id_customer;

    // Ambil data dari session
    const sessionData = req.session.canRate;
    if (!sessionData) {
        return res.json({ success: false, message: "Session hilang!" });
    }

    let { cart_ids, payment_method, items, use_points } = sessionData;

    // Ambil dari body
    const { ratings, comment_rating, isSkip } = req.body;

    // Normalisasi isSkip (boolean murni)
    const isSkipReview = isSkip === true || isSkip === "true";

    // Validasi cart & item
    if (!Array.isArray(cart_ids) || cart_ids.length === 0 || !Array.isArray(items)) {
        return res.json({ success: false, message: "Data transaksi invalid!" });
    }

    // ================= HELPER POINT =================
    async function addPoints(id, amt) {
        const [rows] = await db.query(
            "SELECT qty_point FROM point WHERE id_customer=?",
            [id]
        );

        if (rows.length === 0) {
            await db.query(
                "INSERT INTO point (id_customer, qty_point) VALUES (?, ?)",
                [id, amt]
            );
        } else {
            await db.query(
                "UPDATE point SET qty_point = qty_point + ? WHERE id_customer=?",
                [amt, id]
            );
        }
    }

    async function deductPoints(id, amt) {
        await db.query(
            "UPDATE point SET qty_point = qty_point - ? WHERE id_customer=?",
            [amt, id]
        );
    }

    // ================= PREPARE TRANSACTION DATA =================
    const menuNames = items.map(i => i.name_cart).join(", ");
    const qtys = items.map(i => i.qty_cart).join(",");
    const subtotals = items.map(i => i.total_cart).join(",");

    let total = items.reduce((sum, i) => sum + i.total_cart, 0);

    try {
        // ================= DISCOUNT =================
        // Voucher Sabtu
        if (req.session.voucherActive) {
            total *= 0.8;
        }

        // Tukar poin
        if (use_points === "true") {
            const [ptRow] = await db.query(
                "SELECT qty_point FROM point WHERE id_customer=?",
                [id_customer]
            );

            const currentPoints = ptRow.length ? ptRow[0].qty_point : 0;
            if (currentPoints >= 50) {
                total *= 0.5;
                await deductPoints(id_customer, 50);
            }
        }

        // ================= INSERT TRANSACTION =================
        const [trxResult] = await db.query(
            `INSERT INTO transaction 
            (id_customer, menu_transaction, qty_transaction, subtotal_transaction, paymentMethod_transaction, total_transaction, date_transaction)
            VALUES (?, ?, ?, ?, ?, ?, NOW())`,
            [id_customer, menuNames, qtys, subtotals, payment_method, total]
        );

        const id_transaction = trxResult.insertId;

        // Reward belanja
        await addPoints(id_customer, 10);

        // ================= INSERT RATING (JIKA TIDAK SKIP) =================
        if (!isSkipReview) {
            if (!Array.isArray(ratings) || ratings.length === 0) {
                throw new Error("Rating kosong");
            }

            const [ratingResult] = await db.query(
                `INSERT INTO rating 
                (id_transaction, id_customer, comment_rating, date_rating)
                VALUES (?, ?, ?, NOW())`,
                [id_transaction, id_customer, comment_rating || null]
            );

            const id_rating = ratingResult.insertId;

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
        }

        // ================= UPDATE STOCK =================
        for (const item of items) {
            if (item.id_food) {
                await db.query(
                    "UPDATE food SET qty_food = qty_food - ? WHERE id_food=?",
                    [item.qty_cart, item.id_food]
                );
            } else if (item.id_drink) {
                await db.query(
                    "UPDATE drink SET qty_drink = qty_drink - ? WHERE id_drink=?",
                    [item.qty_cart, item.id_drink]
                );
            }
        }

        // ================= CLEAR CART =================
        await db.query(
            "DELETE FROM cart WHERE id_cart IN (?)",
            [cart_ids]
        );

        // Hapus session rating
        req.session.canRate = null;

        return res.json({ success: true });

    } catch (err) {
        console.error("❌ RATING SUBMIT ERROR:", err);
        return res.json({ success: false, message: "Server error" });
    }
});


// ===================== TRANSACTIONS HISTORY (SUM SUBTOTAL MANUAL) =====================
router.get("/transactions", checkLogin, async (req, res) => {
    const id_customer = req.session.user.id_customer;
    try {
        const [rows] = await db.query(`SELECT qty_point FROM point WHERE id_customer = ?`, [id_customer]);
        const point = rows.length ? rows[0].qty_point : 0;

        const [rawTransactions] = await db.query(`SELECT * FROM transaction WHERE id_customer = ? ORDER BY date_transaction DESC`, [id_customer]);

        let totalHistory = 0;

        // PROSES DATA DI BACKEND
        const transactions = rawTransactions.map(tr => {
            const menuArr = tr.menu_transaction ? tr.menu_transaction.split(',') : [];
            const qtyArr = tr.qty_transaction ? tr.qty_transaction.toString().split(',') : [];
            const subtotalArr = tr.subtotal_transaction ? tr.subtotal_transaction.toString().split(',') : [];

            // --- REVISI DI SINI ---
            // Kita hitung manual total dari string subtotal_transaction
            // Mengabaikan kolom 'Total_transaction' di database
            let transactionSum = 0;
            
            subtotalArr.forEach(priceStr => {
                // Bersihkan spasi dan ubah ke angka
                const price = Number(priceStr.trim()) || 0;
                transactionSum += price;
            });

            // Akumulasi ke Total Pengeluaran Keseluruhan
            totalHistory += transactionSum;

            return {
                id_transaction: tr.id_transaction,
                date_transaction: tr.date_transaction,
                paymentMethod_transaction: tr.paymentMethod_transaction || "-",
                items: menuArr,
                qtys: qtyArr,
                subtotals: subtotalArr,
                // Kirim hasil penjumlahan manual subtotal
                final_total: transactionSum 
            };
        });

        res.render("transaction", { 
            user: req.session.user, 
            role: req.session.role, 
            transactions, 
            totalHistory, // Ini sekarang adalah total dari semua subtotal
            point, 
            page: 'transactions' 
        });
        
    } catch (err) {
        console.error("❌ Database error:", err);
        res.status(500).send("Server error");
    }
});

// ===================== FORUM & LOGOUT =====================
router.get("/forum", checkLogin, async (req, res) => {
    /* ... (Logika forum sama seperti sebelumnya) ... */
    const id_customer = req.session.user.id_customer;
    try {
        const [rows] = await db.query(`SELECT qty_point FROM point WHERE id_customer = ?`, [id_customer]);
        const point = rows.length > 0 ? rows[0].qty_point : 0;
        const sql = `SELECT r.id_rating, r.date_rating, r.comment_rating, rd.menu_rating_detail, rd.qty_rating_detail, rd.value_rating_detail, c.fullname_customer FROM rating r JOIN rating_detail rd ON r.id_rating = rd.id_rating JOIN customer c ON r.id_customer = c.id_customer ORDER BY r.date_rating DESC`;
        const [results] = await db.query(sql);
        const ratingsMap = {};
        results.forEach(row => {
            if (!ratingsMap[row.id_rating]) {
                ratingsMap[row.id_rating] = {
                    id_rating: row.id_rating, date_rating: row.date_rating, fullname_customer: row.fullname_customer, comment_rating: row.comment_rating || "Tidak ada komentar.", purchasedItems: []
                };
            }
            ratingsMap[row.id_rating].purchasedItems.push({ name: row.menu_rating_detail, qty: row.qty_rating_detail, value_rating: row.value_rating_detail });
        });
        res.render("forum", { user: req.session.user, role: req.session.role, ratings: Object.values(ratingsMap), point, page: 'forum' });
    } catch (err) { res.status(500).send("Server error"); }
});

router.get("/logout", (req, res) => {
    req.session.destroy(err => { if (err) console.error("❌"); res.redirect("/"); });
});

router.get("/rating/:id_transaction", checkLogin, async (req, res) => {
    /* ... (Logika rating detail sama) ... */
    const { id_transaction } = req.params; const { id_customer } = req.session.user;
    try {
        const [trans] = await db.query(`SELECT * FROM transaction WHERE id_transaction=? AND id_customer=?`, [id_transaction, id_customer]);
        if(trans.length===0) return res.send("<script>alert('Not found');window.location.href='/transactions'</script>");
        if(trans[0].is_rated) return res.send("<script>alert('Rated');window.location.href='/transactions'</script>");
        const [carts] = await db.query(`SELECT * FROM cart WHERE id_customer=? AND created_at<=?`, [id_customer, trans[0].date_transaction]);
        req.session.canRate = { id_transaction, cart_ids: carts.map(c=>c.id_cart) };
        const [rows] = await db.query(`SELECT qty_point FROM point WHERE id_customer=?`, [id_customer]);
        res.render("rating", { user: req.session.user, transaction: trans[0], items: carts, point: rows.length?rows[0].qty_point:0 });
    } catch(err) { res.status(500).send("Error"); }
});

module.exports = router;
