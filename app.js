const express = require("express");
const bodyParser = require("body-parser");
const session = require("express-session");

const authRouter = require("./routes/auth");
const mainMenuRouter = require("./routes/mainMenu");
const adminRouter = require("./routes/adminRoutes");

const app = express();

// ===== Middleware =====
// Static files (CSS, JS, images)
app.use(express.static("public"));

// Body parser untuk form URL-encoded
app.use(bodyParser.urlencoded({ extended: true }));

// Body parser untuk JSON (buat fetch / rating)
app.use(express.json());

// Session
app.use(
  session({
    secret: "cs_secret",
    resave: false,
    saveUninitialized: true,
  })
);

// View engine
app.set("view engine", "ejs");

// ===== Routes =====
app.use("/", authRouter);
app.use("/", mainMenuRouter);
app.use("/", adminRouter);

// ===== 404 handler =====
app.use((req, res) => {
  res.status(404).send("<h1>404 Not Found</h1>");
});

// Jalankan server
const PORT = 3001;
app.listen(PORT, () => console.log(`Server running at http://localhost:${PORT}`));
