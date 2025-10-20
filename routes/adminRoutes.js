const express = require("express");
const router = express.Router();
const db = require("../connect");
const { isAdmin } = require("../middleware/authMiddleware");

// Terapkan middleware 'isAdmin' ke semua rute di file ini.
router.use("/admin", isAdmin);


// == DASHBOARD UTAMA
router.get("/admin/dashboard", async (req, res) => {
  try {
    const [foods] = await db.query("SELECT * FROM food ORDER BY id_food DESC");
    const [drinks] = await db.query("SELECT * FROM drink ORDER BY id_drink DESC");
    const [suppliers] = await db.query("SELECT * FROM supplier ORDER BY id_supplier DESC");

    res.render("admin/dashboard", {
      foods,
      drinks,
      suppliers,
      user: req.session.user,
      page_name: "admin_dashboard"
    });
  } catch (err) {
    console.error("Database error:", err);
    res.status(500).send("Server Error");
  }
});
// == CRUD UNTUK FOODS
// Tampilkan form tambah food
router.get("/admin/food/add", (req, res) => {
  res.render("admin/add_food", { user: req.session.user, page_name: "admin_add_food" });
});

// Proses tambah food
router.post("/admin/food/add", async (req, res) => {
  const { name_food, qty_food, price_food } = req.body;
  await db.query("INSERT INTO food (name_food, qty_food, price_food) VALUES (?, ?, ?)", [name_food, qty_food, price_food]);
  res.redirect("/admin/dashboard");
});

// Tampilkan form edit food
router.get("/admin/food/edit/:id", async (req, res) => {
  const { id } = req.params;
  const [foods] = await db.query("SELECT * FROM food WHERE id_food = ?", [id]);
  res.render("admin/edit_food", { food: foods[0], user: req.session.user, page_name: "admin_edit_food" });
});

// Proses edit food
router.post("/admin/food/edit/:id", async (req, res) => {
  const { id } = req.params;
  const { name_food, qty_food, price_food } = req.body;
  await db.query("UPDATE food SET name_food = ?, qty_food = ?, price_food = ? WHERE id_food = ?", [name_food, qty_food, price_food, id]);
  res.redirect("/admin/dashboard");
});

// Proses hapus food
router.post("/admin/food/delete/:id", async (req, res) => {
  const { id } = req.params;
  await db.query("DELETE FROM food WHERE id_food = ?", [id]);
  res.redirect("/admin/dashboard");
});

// CRUD UNTUK DRINKS
// Tampilkan form tambah drink
router.get("/admin/drink/add", (req, res) => {
  res.render("admin/add_drink", { user: req.session.user, page_name: "admin_add_drink" });
});

// Proses tambah drink
router.post("/admin/drink/add", async (req, res) => {
  const { name_drink, qty_drink, price_drink } = req.body;
  await db.query("INSERT INTO drink (name_drink, qty_drink, price_drink) VALUES (?, ?, ?)", [name_drink, qty_drink, price_drink]);
  res.redirect("/admin/dashboard");
});

// Tampilkan form edit drink
router.get("/admin/drink/edit/:id", async (req, res) => {
  const { id } = req.params;
  const [drinks] = await db.query("SELECT * FROM drink WHERE id_drink = ?", [id]);
  res.render("admin/edit_drink", { drink: drinks[0], user: req.session.user, page_name: "admin_edit_drink" });
});

// Proses edit drink
router.post("/admin/drink/edit/:id", async (req, res) => {
  const { id } = req.params;
  const { name_drink, qty_drink, price_drink } = req.body;
  await db.query("UPDATE drink SET name_drink = ?, qty_drink = ?, price_drink = ? WHERE id_drink = ?", [name_drink, qty_drink, price_drink, id]);
  res.redirect("/admin/dashboard");
});

// Proses hapus drink
router.post("/admin/drink/delete/:id", async (req, res) => {
  const { id } = req.params;
  await db.query("DELETE FROM drink WHERE id_drink = ?", [id]);
  res.redirect("/admin/dashboard");
});

// == CRUD UNTUK SUPPLIERS
// Tampilkan form tambah supplier
router.get("/admin/supplier/add", (req, res) => {
  res.render("admin/add_supplier", { user: req.session.user, page_name: "admin_add_supplier" });
});

// Proses tambah supplier
router.post("/admin/supplier/add", async (req, res) => {
  const { name_supplier, email_supplier, pnumber_supplier, address_supplier } = req.body;
  await db.query("INSERT INTO supplier (name_supplier, email_supplier, pnumber_supplier, address_supplier) VALUES (?, ?, ?, ?)", [name_supplier, email_supplier, pnumber_supplier, address_supplier]);
  res.redirect("/admin/dashboard");
});

// Tampilkan form edit supplier
router.get("/admin/supplier/edit/:id", async (req, res) => {
  const { id } = req.params;
  const [suppliers] = await db.query("SELECT * FROM supplier WHERE id_supplier = ?", [id]);
  res.render("admin/edit_supplier", { supplier: suppliers[0], user: req.session.user, page_name: "admin_edit_supplier" });
});

// Proses edit supplier
router.post("/admin/supplier/edit/:id", async (req, res) => {
  const { id } = req.params;
  const { name_supplier, email_supplier, pnumber_supplier, address_supplier } = req.body;
  await db.query("UPDATE supplier SET name_supplier = ?, email_supplier = ?, pnumber_supplier = ?, address_supplier = ? WHERE id_supplier = ?", [name_supplier, email_supplier, pnumber_supplier, address_supplier, id]);
  res.redirect("/admin/dashboard");
});

// Proses hapus supplier
router.post("/admin/supplier/delete/:id", async (req, res) => {
  const { id } = req.params;
  await db.query("DELETE FROM supplier WHERE id_supplier = ?", [id]);
  res.redirect("/admin/dashboard");
});


module.exports = router;