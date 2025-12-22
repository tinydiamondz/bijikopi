const express = require("express");
const bodyParser = require("body-parser");
const session = require("express-session");
require("dotenv").config();
const authRouter = require("./routes/auth");
const mainMenuRouter = require("./routes/mainMenu");
const adminRouter = require("./routes/adminRoutes");
const fs = require("fs");
const https = require("https");

// Baca port dari env atau default 443
const PORT = process.env.SRV_PORT || 443;

const app = express();

// ===== Middleware =====
app.use(express.static("public"));
app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.json());
app.use(
  session({
    secret: "cs_secret",
    resave: false,
    saveUninitialized: true,
  })
);

app.set("view engine", "ejs");

// ===== Routes =====
app.use("/", authRouter);
app.use("/", mainMenuRouter);
app.use("/", adminRouter);

// ===== 404 handler =====
app.use((req, res) => {
  res.status(404).send("<h1>404 Not Found</h1>");
});

app.listen(8080, () => {
  console.log("Server running at www.bijikopi.store or 72.62.121.156");
})
// // ===== HTTPS Server =====
// const options = {
//   key: fs.readFileSync("/path/to/your/key.pem"),   // ganti path sesuai sertifikat
//   cert: fs.readFileSync("/path/to/your/cert.pem")  // ganti path sesuai sertifikat
// };

// https.createServer(options, app).listen(PORT, () => {
//   console.log(`Server running at https://localhost:${PORT}`);
// });
