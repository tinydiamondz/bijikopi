const express = require("express");
const router = express.Router();
const db = require("../connect");
const { isAdmin } = require("../middleware/authMiddleware");

// Terapkan middleware 'isAdmin' ke semua rute di file ini.
router.use("/admin", isAdmin);


// == RUTE UTAMA & HALAMAN-HALAMAN TABEL

// Rute default /admin, alihkan ke halaman foods
router.get("/admin", (req, res) => {
    res.redirect("/admin/foods");
});

// Halaman Manajemen FOODS
router.get("/admin/foods", async (req, res) => {
    const [foods] = await db.query("SELECT * FROM food ORDER BY id_food DESC");
    res.render("admin/foods", { foods, user: req.session.user, page_name: "foods" });
});

// Halaman Manajemen DRINKS
router.get("/admin/drinks", async (req, res) => {
    const [drinks] = await db.query("SELECT * FROM drink ORDER BY id_drink DESC");
    res.render("admin/drinks", { drinks, user: req.session.user, page_name: "drinks" });
});

// Halaman Manajemen SUPPLIERS
router.get("/admin/suppliers", async (req, res) => {
    const [suppliers] = await db.query("SELECT * FROM supplier ORDER BY id_supplier DESC");
    res.render("admin/suppliers", { suppliers, user: req.session.user, page_name: "suppliers" });
});


// == SEMUA PROSES CRUD (Create, Update, Delete)

// --- CRUD FOODS ---
router.get("/admin/food/add", (req, res) => res.render("admin/add_food", { user: req.session.user, page_name: "foods" }));
router.post("/admin/food/add", async (req, res) => { /* ... logika tambah food ... */ await db.query(/*...*/); res.redirect("/admin/foods"); }); // UBAH REDIRECT
router.get("/admin/food/edit/:id", async (req, res) => { /* ... logika edit food ... */ });
router.post("/admin/food/edit/:id", async (req, res) => { /* ... logika edit food ... */ await db.query(/*...*/); res.redirect("/admin/foods"); }); // UBAH REDIRECT
router.post("/admin/food/delete/:id", async (req, res) => { await db.query("DELETE FROM food WHERE id_food = ?", [req.params.id]); res.redirect("/admin/foods"); }); // UBAH REDIRECT

// --- CRUD DRINKS ---
router.get("/admin/drink/add", (req, res) => res.render("admin/add_drink", { user: req.session.user, page_name: "drinks" }));
router.post("/admin/drink/add", async (req, res) => { /* ... logika tambah drink ... */ await db.query(/*...*/); res.redirect("/admin/drinks"); }); // UBAH REDIRECT
router.get("/admin/drink/edit/:id", async (req, res) => { /* ... logika edit drink ... */ });
router.post("/admin/drink/edit/:id", async (req, res) => { /* ... logika edit drink ... */ await db.query(/*...*/); res.redirect("/admin/drinks"); }); // UBAH REDIRECT
router.post("/admin/drink/delete/:id", async (req, res) => { await db.query("DELETE FROM drink WHERE id_drink = ?", [req.params.id]); res.redirect("/admin/drinks"); }); // UBAH REDIRECT

// --- CRUD SUPPLIERS ---
router.get("/admin/supplier/add", (req, res) => res.render("admin/add_supplier", { user: req.session.user, page_name: "suppliers" }));
router.post("/admin/supplier/add", async (req, res) => { /* ... logika tambah supplier ... */ await db.query(/*...*/); res.redirect("/admin/suppliers"); }); // UBAH REDIRECT
router.get("/admin/supplier/edit/:id", async (req, res) => { /* ... logika edit supplier ... */ });
router.post("/admin/supplier/edit/:id", async (req, res) => { /* ... logika edit supplier ... */ await db.query(/*...*/); res.redirect("/admin/suppliers"); }); // UBAH REDIRECT
router.post("/admin/supplier/delete/:id", async (req, res) => { await db.query("DELETE FROM supplier WHERE id_supplier = ?", [req.params.id]); res.redirect("/admin/suppliers"); }); // UBAH REDIRECT

// Salin-tempel logika CRUD lengkapmu dari file adminRoutes.js yang lama ke sini,
// tapi pastikan semua `res.redirect()` mengarah ke halaman yang benar.
// Contoh di atas sudah disederhanakan.

module.exports = router;