const express = require("express");
const router = express.Router();
const db = require("../connect"); 

const dailyClaimHistory = new Set();

// Middleware cek login
function checkLogin(req, res, next) {
    if (req.session.user && req.session.role) {
        next();
    } else {
        res.redirect("/login");
    }
}

// HELPER FUNCTIONS
function isSaturday() {
    const today = new Date();
    return today.getDay() === 6;
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

function getActiveId(user) {
    return user.id_customer || user.id_admin;
}

// MAIN PAGE
router.get("/", async (req, res) => {
    const user = req.session.user || null;
    const role = req.session.role || null;
    const id_customer = user ? (user.id_customer || null) : null;
    const id_admin = user ? (user.id_admin || null) : null;

    let point = 0;
    if(user){
        try {
            const [rows] = await db.query(
                `SELECT qty_point FROM point WHERE id_customer = ? OR id_admin = ?`, 
                [id_customer, id_admin]
            );
            point = rows.length > 0 ? rows[0].qty_point : 0;
        } catch(err){
            console.error(err);
        }
    }

    const hasClaimed = user ? dailyClaimHistory.has(`${getTodayString()}_${getActiveId(user)}`) : false;

    res.render("main-menu", { 
        role, user, point,
        currentDateWIB: getCurrentDateTimeWIB(),
        page: 'main',
        isSaturday: isSaturday(),
        hasClaimed: hasClaimed
    });
});

// API: KLAIM VOUCHER
router.post("/claim-voucher", checkLogin, (req, res) => {
    const activeId = getActiveId(req.session.user);

    if (!isSaturday()) return res.json({ success: false, message: "Voucher hanya tersedia hari Sabtu!" });

    const claimKey = `${getTodayString()}_${activeId}`;
    if (dailyClaimHistory.has(claimKey)) return res.json({ success: false, message: "Anda sudah klaim hari ini." });

    dailyClaimHistory.add(claimKey);
    req.session.voucherActive = true;

    return res.json({ success: true, message: "Voucher berhasil diklaim!" });
});

// FOODS & DRINKS PAGES
router.get("/foods", checkLogin, async (req, res) => {
    const user = req.session.user;
    const id_customer = user.id_customer || null;
    const id_admin = user.id_admin || null;

    try {
        const [foods] = await db.query("SELECT * FROM food");
        const [rows] = await db.query(`SELECT qty_point FROM point WHERE id_customer = ? OR id_admin = ?`, [id_customer, id_admin]);
        const point = rows.length > 0 ? rows[0].qty_point : 0;
        res.render("foods", { role: req.session.role, user, foods, added: 0, point, page: 'foods', errorStock: false });
    } catch (err) { res.status(500).send("Server error"); }
});

router.post("/foods", checkLogin, async (req, res) => {
    try {
        const user = req.session.user;
        const id_customer = user.id_customer || null;
        const id_admin = user.id_admin || null;

        const [results] = await db.query("SELECT * FROM food");
        const [rows] = await db.query(`SELECT qty_point FROM point WHERE id_customer = ? OR id_admin = ?`, [id_customer, id_admin]);
        const point = rows.length > 0 ? rows[0].qty_point : 0;
        res.render("foods", { role: req.session.role, user, foods: results, added: 1, point, page: 'foods', errorStock: false });
    } catch (err) { res.status(500).send("Server error"); }
});

router.get("/drinks", checkLogin, async (req, res) => {
    const user = req.session.user;
    const id_customer = user.id_customer || null;
    const id_admin = user.id_admin || null;

    try {
        const [results] = await db.query("SELECT * FROM drink");
        const [rows] = await db.query(`SELECT qty_point FROM point WHERE id_customer = ? OR id_admin = ?`, [id_customer, id_admin]);
        const point = rows.length > 0 ? rows[0].qty_point : 0;
        res.render("drinks", { role: req.session.role, user, drinks: results, added: 0, point, page: 'drinks', errorStock: false });
    } catch (err) { res.status(500).send("Server error"); }
});

router.post("/drinks", checkLogin, async (req, res) => {
    try {
        const user = req.session.user;
        const id_customer = user.id_customer || null;
        const id_admin = user.id_admin || null;

        const [results] = await db.query("SELECT * FROM drink");
        const [rows] = await db.query(`SELECT qty_point FROM point WHERE id_customer = ? OR id_admin = ?`, [id_customer, id_admin]);
        const point = rows.length ? rows[0].qty_point : 0;
        res.render("drinks", { role: req.session.role, user, drinks: results, added: 1, point, page: 'drinks', errorStock: false });
    } catch (err) { res.status(500).send("Server error"); }
});

// CART SYSTEM
router.post("/add-to-cart", checkLogin, async (req, res) => {
    const { id, type } = req.body; 
    const id_customer = req.session.user.id_customer || null;
    const id_admin = req.session.user.id_admin || null;

    try {
        let sqlItem = type === "food" ? "SELECT * FROM food WHERE id_food=?" : "SELECT * FROM drink WHERE id_drink=?";
        const [result] = await db.query(sqlItem, [id]);
        if (result.length === 0) return res.send("Menu tidak ditemukan");

        const item = result[0];
        const name_cart = type === "food" ? item.name_food : item.name_drink;
        const price = type === "food" ? item.price_food : item.price_drink;
        const stock = type === "food" ? item.qty_food : item.qty_drink;

        const id_food = type === "food" ? id : null;
        const id_drink = type === "drink" ? id : null;

        let sqlCheck = `
            SELECT * FROM cart 
            WHERE (id_customer = ? OR id_admin = ?) 
            AND id_food ${id_food ? "=?" : "IS NULL"} 
            AND id_drink ${id_drink ? "=?" : "IS NULL"}
        `;
        let paramsCheck = [id_customer, id_admin];
        if (id_food) paramsCheck.push(id_food);
        if (id_drink) paramsCheck.push(id_drink);

        const [results2] = await db.query(sqlCheck, paramsCheck);

        const afterUpdateOrInsert = async (added, errorStock) => {
            const sqlList = type === "food" ? "SELECT * FROM food" : "SELECT * FROM drink";
            const [listResults] = await db.query(sqlList);
            const [rows] = await db.query("SELECT qty_point FROM point WHERE id_customer = ? OR id_admin = ?", [id_customer, id_admin]);
            const point = rows.length > 0 ? rows[0].qty_point : 0;

            return res.render(type === "food" ? "foods" : "drinks", {
                role: req.session.role,
                user: req.session.user,
                [type === "food" ? "foods" : "drinks"]: listResults,
                added,
                errorStock,
                point,
                page: type === "food" ? "foods" : "drinks"
            });
        };

        if (results2.length > 0) {
            const currentQtyInCart = results2[0].qty_cart;
            if (currentQtyInCart >= stock) {
                return await afterUpdateOrInsert(0, true);
            } else {
                const newQty = currentQtyInCart + 1;
                const newTotal = price * newQty;
                await db.query(`UPDATE cart SET qty_cart=?, total_cart=? WHERE id_cart=?`, [newQty, newTotal, results2[0].id_cart]);
                return await afterUpdateOrInsert(1, false);
            }
        } else {
            if (stock < 1) return await afterUpdateOrInsert(0, true);
           
            await db.query(`
                INSERT INTO cart (name_cart, qty_cart, total_cart, id_drink, id_food, id_customer, id_admin) 
                VALUES (?, 1, ?, ?, ?, ?, ?)`, 
                [name_cart, price, id_drink, id_food, id_customer, id_admin]
            );
            return await afterUpdateOrInsert(1, false);
        }

    } catch (err) {
        console.error("❌ Cart Error:", err);
        res.status(500).send("Server error: " + err.message);
    }
});

// Tampilkan cart
router.get("/cart", checkLogin, async (req, res) => {
    const user = req.session.user;
    const id_customer = user.id_customer || null;
    const id_admin = user.id_admin || null;

    const sql = `
        SELECT c.*, f.price_food, d.price_drink 
        FROM cart c
        LEFT JOIN food f ON c.id_food = f.id_food
        LEFT JOIN drink d ON c.id_drink = d.id_drink
        WHERE c.id_customer = ? OR c.id_admin = ?
    `;
    const sqlTotal = `SELECT SUM(total_cart) AS total_price FROM cart WHERE id_customer = ? OR id_admin = ?`;

    try {
        const [results] = await db.query(sql, [id_customer, id_admin]);
        const [resultTotal] = await db.query(sqlTotal, [id_customer, id_admin]);
        const totalPrice = resultTotal[0].total_price || 0;

        let discount = 0;
        let finalPrice = totalPrice;

        if (req.session.voucherActive) {
            discount = totalPrice * 0.20; 
            finalPrice = totalPrice - discount;
        }

        const [rows] = await db.query(`SELECT qty_point FROM point WHERE id_customer = ? OR id_admin = ?`, [id_customer, id_admin]);
        const point = rows.length > 0 ? rows[0].qty_point : 0;

        const errorStock = req.query.error === "stock" ? true : false;

        res.render("cart", { 
            role: req.session.role, 
            user, cart: results, totalPrice, point, page: 'cart',
            discount, finalPrice, errorStock
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

// ACTION BUTTON DI CART
router.post("/cart/increment", checkLogin, async (req, res) => {
    const { id_cart } = req.body;
    try {
        const [rows] = await db.query(`
            SELECT c.qty_cart, f.qty_food, d.qty_drink, f.price_food, d.price_drink
            FROM cart c
            LEFT JOIN food f ON c.id_food = f.id_food
            LEFT JOIN drink d ON c.id_drink = d.id_drink
            WHERE c.id_cart = ?
        `, [id_cart]);

        if(rows.length === 0) return res.redirect("/cart");

        const row = rows[0];
        const stock = row.qty_food ?? row.qty_drink ?? 0;
        const price = row.price_food ?? row.price_drink ?? 0;

        if(row.qty_cart >= stock) {
            return res.redirect("/cart?error=stock");
        }

        const newQty = row.qty_cart + 1;
        const newTotal = price * newQty;

        await db.query("UPDATE cart SET qty_cart=?, total_cart=? WHERE id_cart=?", [newQty, newTotal, id_cart]);
        res.redirect("/cart");
    } catch(err) { res.status(500).send("Server error"); }
});

// PAYMENT
router.post("/payment", checkLogin, async (req, res) => {
    const user = req.session.user;
    const id_customer = user.id_customer || null;
    const id_admin = user.id_admin || null;
    let selected = req.body.selected; 

    if (!selected) return res.send("<script>alert('Pilih minimal 1 item!'); window.location.href='/cart';</script>");
    const selectedItems = Array.isArray(selected) ? selected : [selected];

    try {
        const sql = `SELECT * FROM cart WHERE (id_customer = ? OR id_admin = ?) AND id_cart IN (?)`;
        const [items] = await db.query(sql, [id_customer, id_admin, selectedItems]);

        if (items.length === 0) return res.send("<script>alert('Item tidak ditemukan!'); window.location.href='/cart';</script>");

        let total = items.reduce((acc, item) => acc + item.total_cart, 0);
        let discount = 0;

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

        const [userPoints] = await db.query("SELECT qty_point FROM point WHERE id_customer = ? OR id_admin = ?", [id_customer, id_admin]);
        const point = userPoints.length > 0 ? userPoints[0].qty_point : 0;

        res.render("payment", { user: req.session.user, items, transaction, point });
    } catch (err) { res.status(500).send("Server error"); }
});

// CONFIRM CHECKOUT
router.post("/confirm", checkLogin, async (req, res) => {
    const id_customer = req.session.user.id_customer || null;
    const id_admin = req.session.user.id_admin || null;
    let selectedItems = req.body.selected;

    if (!selectedItems) return res.send("<script>alert('Tidak ada item dipilih');window.location.href='/cart'</script>");
    selectedItems = Array.isArray(selectedItems) ? selectedItems : [selectedItems];

    const paymentMethod = req.body.payment_method;
    const usePoints = req.body.use_points;

    const [carts] = await db.query(
        `SELECT * FROM cart WHERE (id_customer = ? OR id_admin = ?) AND id_cart IN (?)`,
        [id_customer, id_admin, selectedItems]
    );

    req.session.canRate = {
        id_customer,
        id_admin,
        cart_ids: selectedItems,
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

// SUBMIT TRANSAKSI
router.post("/rating/submit", checkLogin, async (req, res) => {
    const sessionData = req.session.canRate;
    if (!sessionData) return res.json({ success: false, message: "Session hilang!" });

    let { id_customer, id_admin, cart_ids, payment_method, items, use_points } = sessionData;
    const { ratings, comment_rating, isSkip } = req.body;
    const isSkipReview = isSkip === true || isSkip === "true";

    if (!Array.isArray(cart_ids) || cart_ids.length === 0 || !Array.isArray(items)) {
        return res.json({ success: false, message: "Data transaksi invalid!" });
    }

    async function addPoints(idc, ida, amt) {
        const [rows] = await db.query("SELECT qty_point FROM point WHERE id_customer = ? OR id_admin = ?", [idc, ida]);
        if (rows.length === 0) {
            await db.query(
                "INSERT INTO point (id_customer, id_admin, qty_point) VALUES (?, ?, ?)",
                [idc, ida, amt]
            );
        } else {
            await db.query(
                "UPDATE point SET qty_point = qty_point + ? WHERE id_customer = ? OR id_admin = ?",
                [amt, idc, ida]
            );
        }
    }

    async function deductPoints(idc, ida, amt) {
        await db.query(
            "UPDATE point SET qty_point = qty_point - ? WHERE id_customer = ? OR id_admin = ?",
            [amt, idc, ida]
        );
    }

    const menuNames = items.map(i => i.name_cart).join(", ");
    const qtys = items.map(i => i.qty_cart).join(",");
    const subtotals = items.map(i => i.total_cart).join(",");
    let total = items.reduce((sum, i) => sum + i.total_cart, 0);

    try {
        if (req.session.voucherActive) total *= 0.8;

        if (use_points === "true") {
            const [ptRow] = await db.query(
                "SELECT qty_point FROM point WHERE id_customer = ? OR id_admin = ?", 
                [id_customer, id_admin]
            );
            const currentPoints = ptRow.length ? ptRow[0].qty_point : 0;
            if (currentPoints >= 50) {
                total *= 0.5;
                await deductPoints(id_customer, id_admin, 50);
            }
        }

        const [trxResult] = await db.query(
            `INSERT INTO transaction 
            (id_customer, id_admin, menu_transaction, qty_transaction, subtotal_transaction, paymentMethod_transaction, total_transaction, date_transaction)
            VALUES (?, ?, ?, ?, ?, ?, ?, NOW())`,
            [id_customer, id_admin, menuNames, qtys, subtotals, payment_method, total]
        );

        const id_transaction = trxResult.insertId;
        await addPoints(id_customer, id_admin, 10);

        if (!isSkipReview) {
            if (!Array.isArray(ratings) || ratings.length === 0) throw new Error("Rating kosong");
            const [ratingResult] = await db.query(
                `INSERT INTO rating (id_transaction, id_customer, id_admin, comment_rating, date_rating) VALUES (?, ?, ?, ?, NOW())`,
                [id_transaction, id_customer, id_admin, comment_rating || null]
            );
            const id_rating = ratingResult.insertId;
            const ratingDetails = ratings.map(r => [
                id_rating, r.name_cart, null, null, r.qty, r.value_rating
            ]);
            await db.query(
                `INSERT INTO rating_detail (id_rating, menu_rating_detail, id_food, id_drink, qty_rating_detail, value_rating_detail) VALUES ?`,
                [ratingDetails]
            );
        }

        for (const item of items) {
            if (item.id_food) {
                await db.query("UPDATE food SET qty_food = qty_food - ? WHERE id_food=?", [item.qty_cart, item.id_food]);
            } else if (item.id_drink) {
                await db.query("UPDATE drink SET qty_drink = qty_drink - ? WHERE id_drink=?", [item.qty_cart, item.id_drink]);
            }
        }

        await db.query("DELETE FROM cart WHERE id_cart IN (?)", [cart_ids]);
        req.session.canRate = null;

        return res.json({ success: true });

    } catch (err) {
        console.error("❌ TRANSAKSI ERROR:", err);
        return res.json({ success: false, message: "Server error: " + err.message });
    }
});


// TRANSACTIONS HISTORY
router.get("/transactions", checkLogin, async (req, res) => {
    const id_customer = req.session.user.id_customer || null;
    const id_admin = req.session.user.id_admin || null;

    try {
        const [rows] = await db.query(`SELECT qty_point FROM point WHERE id_customer = ? OR id_admin = ?`, [id_customer, id_admin]);
        const point = rows.length ? rows[0].qty_point : 0;
        
        const [rawTransactions] = await db.query(`SELECT * FROM transaction WHERE id_customer = ? OR id_admin = ? ORDER BY date_transaction DESC`, [id_customer, id_admin]);
        
        let totalHistory = 0;
        const transactions = rawTransactions.map(tr => {
            const menuArr = tr.menu_transaction ? tr.menu_transaction.split(',') : [];
            const subtotalArr = tr.subtotal_transaction ? tr.subtotal_transaction.toString().split(',') : [];
            let transactionSum = 0;
            subtotalArr.forEach(priceStr => { transactionSum += Number(priceStr.trim()) || 0; });
            totalHistory += transactionSum;
            return {
                id_transaction: tr.id_transaction, date_transaction: tr.date_transaction, paymentMethod_transaction: tr.paymentMethod_transaction || "-",
                items: menuArr, qtys: (tr.qty_transaction ? tr.qty_transaction.toString().split(',') : []), subtotals: subtotalArr, final_total: transactionSum 
            };
        });
        res.render("transaction", { user: req.session.user, role: req.session.role, transactions, totalHistory, point, page: 'transactions' });
    } catch (err) { res.status(500).send("DB Error"); }
});

// FORUM & LOGOUT
router.get("/forum", checkLogin, async (req, res) => {
    const id_customer = req.session.user.id_customer || null;
    const id_admin = req.session.user.id_admin || null;
    try {
        const [rows] = await db.query(`SELECT qty_point FROM point WHERE id_customer = ? OR id_admin = ?`, [id_customer, id_admin]);
        const point = rows.length > 0 ? rows[0].qty_point : 0;
        const sql = `
            SELECT r.id_rating, r.date_rating, r.comment_rating, 
                   rd.menu_rating_detail, rd.qty_rating_detail, rd.value_rating_detail, 
                   COALESCE(c.fullname_customer, a.username_admin) as user_name
            FROM rating r 
            JOIN rating_detail rd ON r.id_rating = rd.id_rating 
            LEFT JOIN customer c ON r.id_customer = c.id_customer
            LEFT JOIN admin a ON r.id_admin = a.id_admin
            ORDER BY r.date_rating DESC
        `;
        const [results] = await db.query(sql);
        const ratingsMap = {};
        results.forEach(row => {
            if (!ratingsMap[row.id_rating]) ratingsMap[row.id_rating] = { id_rating: row.id_rating, date_rating: row.date_rating, fullname_customer: row.user_name, comment_rating: row.comment_rating || "Tidak ada komentar.", purchasedItems: [] };
            ratingsMap[row.id_rating].purchasedItems.push({ name: row.menu_rating_detail, qty: row.qty_rating_detail, value_rating: row.value_rating_detail });
        });
        res.render("forum", { user: req.session.user, role: req.session.role, ratings: Object.values(ratingsMap), point, page: 'forum' });
    } catch (err) { res.status(500).send("Server error"); }
});

router.get("/logout", (req, res) => {
    req.session.destroy(err => { if (err) console.error("❌"); res.redirect("/"); });
});

router.get("/rating/:id_transaction", checkLogin, async (req, res) => {
    const { id_transaction } = req.params; 
    const id_customer = req.session.user.id_customer || null;
    const id_admin = req.session.user.id_admin || null;

    try {
        const [trans] = await db.query(`SELECT * FROM transaction WHERE id_transaction=? AND (id_customer=? OR id_admin=?)`, [id_transaction, id_customer, id_admin]);
        if(trans.length===0) return res.send("<script>alert('Not found');window.location.href='/transactions'</script>");
        if(trans[0].is_rated) return res.send("<script>alert('Rated');window.location.href='/transactions'</script>");
        const [carts] = await db.query(`SELECT * FROM cart WHERE (id_customer=? OR id_admin=?) AND created_at<=?`, [id_customer, id_admin, trans[0].date_transaction]);
        req.session.canRate = { id_transaction, cart_ids: carts.map(c=>c.id_cart) };
        const [rows] = await db.query(`SELECT qty_point FROM point WHERE id_customer=? OR id_admin=?`, [id_customer, id_admin]);
        res.render("rating", { user: req.session.user, transaction: trans[0], items: carts, point: rows.length?rows[0].qty_point:0 });
    } catch(err) { res.status(500).send("Error"); }
});

router.get("/profile", checkLogin, async (req, res) => {
    const user = req.session.user;
    const id_customer = user.id_customer || null;
    const id_admin = user.id_admin || null;
    
    const teamMembers = [
        { name: "Gerald Alfons Nathaniel Werdiyanto", nim: "00000119185", major: "Informatika", photo: "/images/profile/GeraldProfile.png", email: "geraldalfons2546@gmail.com", linkedin: "https://www.linkedin.com/in/gerald-alfons-nathaniel-werdiyanto-858215325/", job: "Frontend Developer", quote: "\"Stop overthinking the plot. It only reveals itself once you start playing.\"" },
        { name: "Muhammad Faathin Naufal", nim: "00000130562", major: "Informatika", photo: "/images/profile/FaathinProfile.png", email: "mfaathinn@gmail.com", linkedin: "https://www.linkedin.com/in/muhammad-faathin-naufal-0b0924316/", job: "Frontend Developer", quote: "\"Air mendidih tidak menyakiti kopi, ia justru mengeluarkan aroma terbaiknya. Begitu juga tekanan dalam hidupmu.\"" },
        { name: "Rafi Athallah Ahmad Haryanto", nim: "00000130426", major: "Informatika", photo: "/images/profile/RafiProfile.png", email: "tinydiamondzgt@gmail.com", linkedin: "https://www.linkedin.com/in/rafi-athallah-ahmad-haryanto-7575662b9", job: "Backend Developer", quote: "\"Those who don't understand a true pain, will never understand a true peace.\"" },
        { name: "Muhammad Zhaky Alamsyah", nim: "00000130569", major: "Informatika", photo: "/images/profile/AlamProfile.png", email: "zhakyalamsyaa@gmail.com", linkedin: "https://id.linkedin.com/in/zhaky-alamsyah-6776ab300", job: "Frontend Developer", quote: "\"One day or Day One. You decide.\"" },
        { name: "Rafael Lesmana", nim: "00000130565", major: "Informatika", photo: "/images/profile/ElProfile.png", email: "lesmana.rafael@gmail.com", linkedin: "https://www.linkedin.com/in/rafael-lesmana-4a0477292?utm_source=share&utm_campaign=share_via&utm_content=profile&utm_medium=android_app", job: "Backend Developer", quote: "\"When you are tired of being angry, the only choice is to remain silent\"" }
    ];

    try {
        const [rows] = await db.query(`SELECT qty_point FROM point WHERE id_customer = ? OR id_admin = ?`, [id_customer, id_admin]);
        const point = rows.length ? rows[0].qty_point : 0;
        res.render("profile", { role: req.session.role, user, added: 0, point, page: 'profile', teamMembers });
    } catch (err) { console.error("Error rendering profile:", err); res.status(500).send("Server error"); }
});

module.exports = router;
