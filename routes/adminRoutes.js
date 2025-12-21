const express = require("express");
const router = express.Router();
const db = require("../connect");
const { isAdmin } = require("../middleware/authMiddleware");

router.use("/admin", isAdmin);

// HALAMAN UTAMA (FOODS, DRINKS, SUPPLIERS)

// Rute default, alihkan ke halaman foods
router.get("/admin", (req, res) => {
    res.redirect("/admin/foods");
});

//1. MANAJEMEN FOODS (Search + Sort)
router.get("/admin/foods", async (req, res) => {
    try {
        const allowedSortColumns = ['id_food', 'name_food', 'qty_food', 'price_food'];
        const allowedOrders = ['ASC', 'DESC'];
        let sortBy = req.query.sort || 'id_food';
        let order = (req.query.order || 'ASC').toUpperCase();

        if (!allowedSortColumns.includes(sortBy)) sortBy = 'id_food';
        if (!allowedOrders.includes(order)) order = 'ASC';

        const search = req.query.search || "";
        let sql = "SELECT * FROM food";
        let queryParams = [];

        if (search) {
            sql += " WHERE name_food LIKE ? OR qty_food LIKE ? OR price_food LIKE ?";
            const likeStr = `%${search}%`;
            queryParams = [likeStr, likeStr, likeStr];
        }

        sql += ` ORDER BY ${sortBy} ${order}`;

        const [foods] = await db.query(sql, queryParams);

        res.render("admin/foods", { 
            title: "Manage Foods", 
            foods, 
            data: foods, 
            user: req.session.user, 
            page_name: "foods",
            search: search 
        });

    } catch (err) {
        console.error(err);
        res.status(500).send("Database Error");
    }
});

//2. MANAJEMEN DRINKS (Search + Sort)
router.get("/admin/drinks", async (req, res) => {
    try {
        const allowedSortColumns = ['id_drink', 'name_drink', 'qty_drink', 'price_drink'];
        const allowedOrders = ['ASC', 'DESC'];
        let sortBy = req.query.sort || 'id_drink';
        let order = (req.query.order || 'DESC').toUpperCase();

        if (!allowedSortColumns.includes(sortBy)) sortBy = 'id_drink';
        if (!allowedOrders.includes(order)) order = 'DESC';

        const search = req.query.search || "";
        let sql = "SELECT * FROM drink";
        let queryParams = [];

        if (search) {
            sql += " WHERE name_drink LIKE ? OR qty_drink LIKE ? OR price_drink LIKE ?";
            const likeStr = `%${search}%`;
            queryParams = [likeStr, likeStr, likeStr];
        }

        sql += ` ORDER BY ${sortBy} ${order}`;

        const [drinks] = await db.query(sql, queryParams);
        
        res.render("admin/drinks", { 
            title: "Manage Drinks",
            drinks, 
            data: drinks,
            user: req.session.user, 
            page_name: "drinks",
            search: search
        });

    } catch (err) {
        console.error(err);
        res.status(500).send("Database Error");
    }
});

//3. MANAJEMEN SUPPLIERS (Search + Sort)
router.get("/admin/suppliers", async (req, res) => {
    try {
        const allowedSortColumns = ['id_supplier', 'name_supplier', 'email_supplier'];
        const allowedOrders = ['ASC', 'DESC'];
        let sortBy = req.query.sort || 'id_supplier';
        let order = (req.query.order || 'DESC').toUpperCase();

        if (!allowedSortColumns.includes(sortBy)) sortBy = 'id_supplier';
        if (!allowedOrders.includes(order)) order = 'DESC';

        const search = req.query.search || "";
        let sql = "SELECT * FROM supplier";
        let queryParams = [];

        if (search) {
            sql += " WHERE name_supplier LIKE ? OR address_supplier LIKE ? OR pnumber_supplier LIKE ?";
            const likeStr = `%${search}%`;
            queryParams = [likeStr, likeStr, likeStr];
        }

        sql += ` ORDER BY ${sortBy} ${order}`;

        const [suppliers] = await db.query(sql, queryParams);
        
        res.render("admin/suppliers", { 
            title: "Manage Suppliers",
            suppliers, 
            data: suppliers,
            user: req.session.user, 
            page_name: "suppliers",
            search: search
        });

    } catch (err) {
        console.error(err);
        res.status(500).send("Database Error");
    }
});



// SEMUA PROSES CRUD (Create, Update, Delete, Export)

//CRUD FOODS
router.get("/admin/food/add", (req, res) => {
    res.render("admin/add_food", { 
        title: "Tambah Makanan",
        user: req.session.user, 
        page_name: "foods" 
    });
});

router.post("/admin/food/add", async (req, res) => {
    const { name_food, qty_food, price_food } = req.body;
    await db.query("INSERT INTO food (name_food, qty_food, price_food) VALUES (?, ?, ?)", [name_food, qty_food, price_food]);
    res.redirect("/admin/foods");
});

router.get("/admin/food/edit/:id", async (req, res) => {
    try {
        const { id } = req.params;
        const [foods] = await db.query("SELECT * FROM food WHERE id_food = ?", [id]);
        if (foods.length === 0) return res.status(404).send("Data tidak ditemukan.");
        res.render("admin/edit_food", { 
            title: "Edit Makanan",
            food: foods[0], 
            user: req.session.user, 
            page_name: "foods" 
        });
    } catch (err) { res.status(500).send("Server Error"); }
});

router.post("/admin/food/edit/:id", async (req, res) => {
    const { id } = req.params;
    const { name_food, qty_food, price_food } = req.body;
    await db.query("UPDATE food SET name_food = ?, qty_food = ?, price_food = ? WHERE id_food = ?", [name_food, qty_food, price_food, id]);
    res.redirect("/admin/foods");
});

router.post("/admin/food/delete/:id", async (req, res) => {
    const { id } = req.params;
    await db.query("DELETE FROM food WHERE id_food = ?", [id]);
    res.redirect("/admin/foods");
});

router.get("/admin/food/export", async (req, res) => {
    try {
        const [foods] = await db.query("SELECT * FROM food");
        if (foods.length === 0) return res.status(404).send("Tidak ada data.");
        
        const headers = Object.keys(foods[0]).join(',');
        const rows = foods.map(food => Object.values(food).map(val => `"${String(val).replace(/"/g, '""')}"`).join(',')).join('\n');
        
        res.setHeader('Content-Type', 'text/csv');
        res.setHeader('Content-Disposition', 'attachment; filename="laporan_makanan.csv"');
        res.status(200).send(`${headers}\n${rows}`);
    } catch (err) { res.status(500).send("Server Error"); }
});

//CRUD DRINKS
router.get("/admin/drink/add", (req, res) => 
    res.render("admin/add_drink", { 
        title: "Tambah Minuman",
        user: req.session.user, 
        page_name: "drinks" 
    })
);

router.post("/admin/drink/add", async (req, res) => {
    const { name_drink, qty_drink, price_drink } = req.body;
    await db.query("INSERT INTO drink (name_drink, qty_drink, price_drink) VALUES (?, ?, ?)", [name_drink, qty_drink, price_drink]);
    res.redirect("/admin/drinks");
});

router.get("/admin/drink/edit/:id", async (req, res) => {
    try {
        const { id } = req.params;
        const [drinks] = await db.query("SELECT * FROM drink WHERE id_drink = ?", [id]);
        if (drinks.length === 0) return res.status(404).send("Data tidak ditemukan.");
        res.render("admin/edit_drink", { 
            title: "Edit Minuman",
            drink: drinks[0], 
            user: req.session.user, 
            page_name: "drinks" 
        });
    } catch (err) { res.status(500).send("Server Error"); }
});

router.post("/admin/drink/edit/:id", async (req, res) => {
    const { name_drink, qty_drink, price_drink } = req.body;
    await db.query("UPDATE drink SET name_drink = ?, qty_drink = ?, price_drink = ? WHERE id_drink = ?", [name_drink, qty_drink, price_drink, req.params.id]);
    res.redirect("/admin/drinks");
});

router.post("/admin/drink/delete/:id", async (req, res) => {
    await db.query("DELETE FROM drink WHERE id_drink = ?", [req.params.id]);
    res.redirect("/admin/drinks");
});

router.get("/admin/drink/export", async (req, res) => {
    try {
        const [drinks] = await db.query("SELECT * FROM drink");
        if (drinks.length === 0) return res.status(404).send("Tidak ada data.");
        
        const headers = Object.keys(drinks[0]).join(',');
        const rows = drinks.map(d => Object.values(d).map(val => `"${String(val).replace(/"/g, '""')}"`).join(',')).join('\n');
        
        res.setHeader('Content-Type', 'text/csv');
        res.setHeader('Content-Disposition', 'attachment; filename="laporan_minuman.csv"');
        res.status(200).send(`${headers}\n${rows}`);
    } catch (err) { res.status(500).send("Server Error"); }
});

// CRUD SUPPLIERS 
router.get("/admin/supplier/add", (req, res) => {
    res.render("admin/add_supplier", { 
        title: "Tambah Supplier", 
        user: req.session.user, 
        page_name: "suppliers" 
    });
});

router.post("/admin/supplier/add", async (req, res) => {
    const { name_supplier, email_supplier, pnumber_supplier, address_supplier } = req.body;
    await db.query("INSERT INTO supplier (name_supplier, email_supplier, pnumber_supplier, address_supplier) VALUES (?, ?, ?, ?)", [name_supplier, email_supplier, pnumber_supplier, address_supplier]);
    res.redirect("/admin/suppliers");
});

router.get("/admin/supplier/edit/:id", async (req, res) => {
    try {
        const { id } = req.params;
        const [suppliers] = await db.query("SELECT * FROM supplier WHERE id_supplier = ?", [id]);
        if (suppliers.length === 0) return res.status(404).send("Data tidak ditemukan.");
        res.render("admin/edit_supplier", { 
            title: "Edit Supplier", 
            supplier: suppliers[0], 
            user: req.session.user, 
            page_name: "suppliers" 
        });
    } catch (err) { res.status(500).send("Server Error"); }
});

router.post("/admin/supplier/edit/:id", async (req, res) => {
    const { id } = req.params;
    const { name_supplier, email_supplier, pnumber_supplier, address_supplier } = req.body;
    await db.query("UPDATE supplier SET name_supplier = ?, email_supplier = ?, pnumber_supplier = ?, address_supplier = ? WHERE id_supplier = ?", [name_supplier, email_supplier, pnumber_supplier, address_supplier, id]);
    res.redirect("/admin/suppliers");
});

router.post("/admin/supplier/delete/:id", async (req, res) => {
    const { id } = req.params;
    await db.query("DELETE FROM supplier WHERE id_supplier = ?", [id]);
    res.redirect("/admin/suppliers");
});

router.get("/admin/supplier/export", async (req, res) => {
    try {
        const [suppliers] = await db.query("SELECT * FROM supplier");
        if (suppliers.length === 0) return res.status(404).send("Tidak ada data.");
        
        const headers = Object.keys(suppliers[0]).join(',');
        const rows = suppliers.map(s => Object.values(s).map(val => `"${String(val).replace(/"/g, '""')}"`).join(',')).join('\n');
        
        res.setHeader('Content-Type', 'text/csv');
        res.setHeader('Content-Disposition', 'attachment; filename="laporan_supplier.csv"');
        res.status(200).send(`${headers}\n${rows}`);
    } catch (err) { res.status(500).send("Server Error"); }
});

// 1. HALAMAN SALES
router.get('/admin/sales', async (req, res) => {
    try {
        const search = req.query.search || "";
        
        let whereClause = "";
        let queryParams = [];

        if (search) {
            whereClause = "WHERE DATE_FORMAT(date_transaction, '%M %Y') LIKE ? OR menu_transaction LIKE ?";
            const likeStr = `%${search}%`;
            queryParams = [likeStr, likeStr];
        }

        const queryTotal = `SELECT SUM(Total_transaction) AS grand_total FROM transaction ${whereClause}`;
        const [resultTotal] = await db.query(queryTotal, queryParams);

        const queryDetails = `
            SELECT 
                DATE_FORMAT(date_transaction, '%M %Y') AS month_label,
                DATE_FORMAT(date_transaction, '%Y-%m') AS sort_key,
                TRIM(UPPER(menu_transaction)) AS item_name, 
                SUM(qty_transaction) as total_qty, 
                SUM(subtotal_transaction) as total_revenue 
            FROM transaction 
            ${whereClause}
            GROUP BY sort_key, month_label, TRIM(UPPER(menu_transaction)) 
            ORDER BY sort_key DESC, total_qty DESC
        `;
        
        const [rawDetails] = await db.query(queryDetails, queryParams);

        const groupedSales = {};
        rawDetails.forEach(row => {
            if (!groupedSales[row.month_label]) {
                groupedSales[row.month_label] = [];
            }
            groupedSales[row.month_label].push(row);
        });

        res.render('admin/sales', {
            title: 'Laporan Penjualan',
            page_name: 'sales',
            user: req.session.user,
            grand_total: resultTotal[0].grand_total || 0,
            groupedSales: groupedSales,
            search: search 
        });

    } catch (err) {
        console.error("Error sales report:", err);
        res.status(500).send("Database Error: " + err.message);
    }
});

// 2. DOWNLOAD CSV
router.get('/admin/sales/export', async (req, res) => {
    try {
        const search = req.query.search || "";
        
        let whereClause = "";
        let queryParams = [];

        if (search) {
            whereClause = "WHERE DATE_FORMAT(date_transaction, '%M %Y') LIKE ?";
            queryParams = [`%${search}%`];
        }

        const query = `
            SELECT 
                date_transaction, 
                id_transaction, 
                TRIM(UPPER(menu_transaction)) as menu, 
                qty_transaction, 
                Total_transaction 
            FROM transaction 
            ${whereClause}
            ORDER BY date_transaction DESC
        `;
        const [rows] = await db.query(query, queryParams);

        if (rows.length === 0) return res.status(404).send("Tidak ada data transaksi.");

        let csv = "Tanggal,ID Transaksi,Menu,Qty,Total Harga\n";

        let currentMonth = "";
        let monthRevenue = 0;
        let grandTotal = 0;
        let monthRowsBuffer = "";

        const formatRupiah = (num) => "Rp " + num.toLocaleString('id-ID');

        const getMonthName = (dateStr) => {
            const date = new Date(dateStr);
            return date.toLocaleDateString('id-ID', { month: 'long', year: 'numeric' });
        };

        rows.forEach((row, index) => {
            const rowDate = new Date(row.date_transaction);
            const rowMonth = getMonthName(row.date_transaction);
            const rowTotal = Number(row.Total_transaction) || 0;

            if (currentMonth !== "" && rowMonth !== currentMonth) {
                csv += `\n${currentMonth}\n`;
                csv += monthRowsBuffer;
                csv += `,,,TOTAL PENDAPATAN ${currentMonth.toUpperCase()},${formatRupiah(monthRevenue)}\n`;
                
                monthRevenue = 0;
                monthRowsBuffer = "";
            }

            currentMonth = rowMonth;

            const dateStr = rowDate.toLocaleDateString('id-ID');

            monthRowsBuffer += `"${dateStr}","#${row.id_transaction}","${row.menu}",${row.qty_transaction},${row.Total_transaction}\n`;
            monthRevenue += rowTotal;
            grandTotal += rowTotal;

            if (index === rows.length - 1) {
                csv += `\n${currentMonth}\n`;
                csv += monthRowsBuffer;
                csv += `,,,TOTAL PENDAPATAN ${currentMonth.toUpperCase()},${formatRupiah(monthRevenue)}\n`;
            }
        });

        csv += `\n,,,GRAND TOTAL SEMUA,${formatRupiah(grandTotal)}\n`;

        res.setHeader('Content-Type', 'text/csv');
        const filename = search ? `laporan_penjualan_${search.replace(/ /g, '_')}.csv` : "laporan_penjualan_per_bulan.csv";
        res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
        res.status(200).send(csv);

    } catch (err) {
        console.error("Export Error:", err);
        res.status(500).send("Server Error");
    }
});

module.exports = router;
