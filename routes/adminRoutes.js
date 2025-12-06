const express = require("express");
const router = express.Router();
const db = require("../connect");
const { isAdmin } = require("../middleware/authMiddleware");

// Terapkan middleware 'isAdmin' ke semua rute di file ini.
router.use("/admin", isAdmin);

// ========================================================
// == HALAMAN-HALAMAN UTAMA (FOODS, DRINKS, SUPPLIERS)
// ========================================================

// Rute default, alihkan ke halaman foods
router.get("/admin", (req, res) => {
    res.redirect("/admin/foods");
});

// Halaman Manajemen FOODS
router.get("/admin/foods", async (req, res) => {
    // 1. Daftar kolom yang diizinkan untuk di-sort & urutan yang diizinkan
    const allowedSortColumns = ['id_food', 'name_food', 'qty_food', 'price_food'];
    const allowedOrders = ['ASC', 'DESC'];

    // 2. Ambil parameter dari URL, beri nilai default jika tidak ada
    let sortBy = req.query.sort || 'id_food';
    let order = (req.query.order || 'ASC').toUpperCase();

    // 3. Validasi parameter agar aman dari SQL Injection
    if (!allowedSortColumns.includes(sortBy)) {
        sortBy = 'id_food'; // Kembali ke default jika kolom tidak valid
    }
    if (!allowedOrders.includes(order)) {
        order = 'ASC'; // Kembali ke default jika urutan tidak valid
    }

    // 4. Buat query SQL dinamis dan ambil data
    const sql = `SELECT * FROM food ORDER BY ${sortBy} ${order}`;
    const [foods] = await db.query(sql);

    res.render("admin/foods", { foods, user: req.session.user, page_name: "foods" });
});

// Halaman Manajemen DRINKS
router.get("/admin/drinks", async (req, res) => {
    const allowedSortColumns = ['id_drink', 'name_drink', 'qty_drink', 'price_drink'];
    const allowedOrders = ['ASC', 'DESC'];
    
    let sortBy = req.query.sort || 'id_drink';
    let order = (req.query.order || 'ASC').toUpperCase();

    if (!allowedSortColumns.includes(sortBy)) sortBy = 'id_drink';
    if (!allowedOrders.includes(order)) order = 'ASC';
    
    const sql = `SELECT * FROM drink ORDER BY ${sortBy} ${order}`;
    const [drinks] = await db.query(sql);
    
    res.render("admin/drinks", { drinks, user: req.session.user, page_name: "drinks" });
});

// Halaman Manajemen SUPPLIERS
router.get("/admin/suppliers", async (req, res) => {
    const allowedSortColumns = ['id_supplier', 'name_supplier', 'email_supplier'];
    const allowedOrders = ['ASC', 'DESC'];

    let sortBy = req.query.sort || 'id_supplier';   
    let order = (req.query.order || 'ASC').toUpperCase();

    if (!allowedSortColumns.includes(sortBy)) sortBy = 'id_supplier';
    if (!allowedOrders.includes(order)) order = 'ASC';

    const sql = `SELECT * FROM supplier ORDER BY ${sortBy} ${order}`;
    const [suppliers] = await db.query(sql);
    
    res.render("admin/suppliers", { suppliers, user: req.session.user, page_name: "suppliers" });
});


// ========================================================
// == SEMUA PROSES CRUD (Create, Update, Delete)
// ========================================================

// --- CRUD UNTUK FOODS ---

// Tampilkan form tambah food
router.get("/admin/food/add", (req, res) => {
    res.render("admin/add_food", { user: req.session.user, page_name: "foods" });
});

// Proses tambah food
router.post("/admin/food/add", async (req, res) => {
    const { name_food, qty_food, price_food } = req.body;
    await db.query("INSERT INTO food (name_food, qty_food, price_food) VALUES (?, ?, ?)", [name_food, qty_food, price_food]);
    res.redirect("/admin/foods"); // Redirect ke halaman foods
});

// Tampilkan form edit food
router.get("/admin/food/edit/:id", async (req, res) => {
    try {
        const { id } = req.params;
        const [foods] = await db.query("SELECT * FROM food WHERE id_food = ?", [id]);
        if (foods.length === 0) {
            return res.status(404).send("Makanan dengan ID tersebut tidak ditemukan.");
        }
        res.render("admin/edit_food", { 
            food: foods[0], 
            user: req.session.user, 
            page_name: "foods" 
        });
    } catch (err) {
        console.error("Error fetching food for edit:", err);
        res.status(500).send("Terjadi kesalahan pada server.");
    }
});

router.get("/admin/food/export", async (req, res) => {
    try {
        const [foods] = await db.query("SELECT * FROM food");

        if (foods.length === 0) {
            return res.status(404).send("Tidak ada data makanan untuk diekspor.");
        }

        // Buat header CSV dari nama kolom
        const headers = Object.keys(foods[0]).join(',');

        // Ubah setiap baris data menjadi string CSV
        const rows = foods.map(food => {
            return Object.values(food).map(value => {
                const strValue = String(value).replace(/"/g, '""'); // Escape double quotes
                return `"${strValue}"`; // Bungkus semua nilai dengan kutip ganda
            }).join(',');
        }).join('\n');

        const csvContent = `${headers}\n${rows}`;

        // Set header agar browser men-download file
        res.setHeader('Content-Type', 'text/csv');
        res.setHeader('Content-Disposition', 'attachment; filename="laporan_makanan.csv"');
        res.status(200).send(csvContent);

    } catch (err) {
        console.error("Gagal mengekspor data makanan:", err);
        res.status(500).send("Server Error");
    }
});

// Proses edit food
router.post("/admin/food/edit/:id", async (req, res) => {
    const { id } = req.params;
    const { name_food, qty_food, price_food } = req.body;
    await db.query("UPDATE food SET name_food = ?, qty_food = ?, price_food = ? WHERE id_food = ?", [name_food, qty_food, price_food, id]);
    res.redirect("/admin/foods"); // Redirect ke halaman foods
});

// Proses hapus food
router.post("/admin/food/delete/:id", async (req, res) => {
    const { id } = req.params;
    await db.query("DELETE FROM food WHERE id_food = ?", [id]);
    res.redirect("/admin/foods"); // Redirect ke halaman foods
});


// --- CRUD UNTUK DRINKS --- (Sudah diperbaiki sebelumnya)

router.get("/admin/drink/add", (req, res) => res.render("admin/add_drink", { user: req.session.user, page_name: "drinks" }));
router.post("/admin/drink/add", async (req, res) => { /* ... logika ... */ await db.query("INSERT INTO drink (name_drink, qty_drink, price_drink) VALUES (?, ?, ?)", [req.body.name_drink, req.body.qty_drink, req.body.price_drink]); res.redirect("/admin/drinks"); });
router.get("/admin/drink/edit/:id", async (req, res) => { try { const { id } = req.params; const [drinks] = await db.query("SELECT * FROM drink WHERE id_drink = ?", [id]); if (drinks.length === 0) { return res.status(404).send("Minuman tidak ditemukan."); } res.render("admin/edit_drink", { drink: drinks[0], user: req.session.user, page_name: "drinks" }); } catch (err) { res.status(500).send("Server Error"); } });
router.post("/admin/drink/edit/:id", async (req, res) => { /* ... logika ... */ await db.query("UPDATE drink SET name_drink = ?, qty_drink = ?, price_drink = ? WHERE id_drink = ?", [req.body.name_drink, req.body.qty_drink, req.body.price_drink, req.params.id]); res.redirect("/admin/drinks"); });
router.post("/admin/drink/delete/:id", async (req, res) => { await db.query("DELETE FROM drink WHERE id_drink = ?", [req.params.id]); res.redirect("/admin/drinks"); });
router.get("/admin/drink/export", async (req, res) => {
    try {
        const [drinks] = await db.query("SELECT * FROM drink");

        if (drinks.length === 0) {
            return res.status(404).send("Tidak ada data minuman untuk diekspor.");
        }
        
        const headers = Object.keys(drinks[0]).join(',');
        const rows = drinks.map(drink => {
            return Object.values(drink).map(value => `"${String(value).replace(/"/g, '""')}"`).join(',');
        }).join('\n');
        
        const csvContent = `${headers}\n${rows}`;

        res.setHeader('Content-Type', 'text/csv');
        res.setHeader('Content-Disposition', 'attachment; filename="laporan_minuman.csv"');
        res.status(200).send(csvContent);

    } catch (err) {
        console.error("Gagal mengekspor data minuman:", err);
        res.status(500).send("Server Error");
    }
});

// --- CRUD UNTUK SUPPLIERS ---

// Tampilkan form tambah supplier
router.get("/admin/supplier/add", (req, res) => {
    res.render("admin/add_supplier", { user: req.session.user, page_name: "suppliers" });
});

// Proses tambah supplier
router.post("/admin/supplier/add", async (req, res) => {
    const { name_supplier, email_supplier, pnumber_supplier, address_supplier } = req.body;
    await db.query("INSERT INTO supplier (name_supplier, email_supplier, pnumber_supplier, address_supplier) VALUES (?, ?, ?, ?)", [name_supplier, email_supplier, pnumber_supplier, address_supplier]);
    res.redirect("/admin/suppliers"); // Redirect ke halaman suppliers
});

// Tampilkan form edit supplier
router.get("/admin/supplier/edit/:id", async (req, res) => {
    try {
        const { id } = req.params;
        const [suppliers] = await db.query("SELECT * FROM supplier WHERE id_supplier = ?", [id]);
        if (suppliers.length === 0) {
            return res.status(404).send("Supplier dengan ID tersebut tidak ditemukan.");
        }
        res.render("admin/edit_supplier", { 
            supplier: suppliers[0], 
            user: req.session.user, 
            page_name: "suppliers" 
        });
    } catch (err) {
        console.error("Error fetching supplier for edit:", err);
        res.status(500).send("Terjadi kesalahan pada server.");
    }
});

router.get("/admin/supplier/export", async (req, res) => {
    try {
        const [suppliers] = await db.query("SELECT * FROM supplier");
        
        if (suppliers.length === 0) {
            return res.status(404).send("Tidak ada data supplier untuk diekspor.");
        }
        
        const headers = Object.keys(suppliers[0]).join(',');
        const rows = suppliers.map(supplier => {
            return Object.values(supplier).map(value => `"${String(value).replace(/"/g, '""')}"`).join(',');
        }).join('\n');
        
        const csvContent = `${headers}\n${rows}`;

        res.setHeader('Content-Type', 'text/csv');
        res.setHeader('Content-Disposition', 'attachment; filename="laporan_supplier.csv"');
        res.status(200).send(csvContent);

    } catch (err) {
        console.error("Gagal mengekspor data supplier:", err);
        res.status(500).send("Server Error");
    }
});

// Proses edit supplier
router.post("/admin/supplier/edit/:id", async (req, res) => {
    const { id } = req.params;
    const { name_supplier, email_supplier, pnumber_supplier, address_supplier } = req.body;
    await db.query("UPDATE supplier SET name_supplier = ?, email_supplier = ?, pnumber_supplier = ?, address_supplier = ? WHERE id_supplier = ?", [name_supplier, email_supplier, pnumber_supplier, address_supplier, id]);
    res.redirect("/admin/suppliers"); // Redirect ke halaman suppliers
});

// Proses hapus supplier
router.post("/admin/supplier/delete/:id", async (req, res) => {
    const { id } = req.params;
    await db.query("DELETE FROM supplier WHERE id_supplier = ?", [id]);
    res.redirect("/admin/suppliers"); // Redirect ke halaman suppliers
});


module.exports = router;
