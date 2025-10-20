const isAdmin = (req, res, next) => {
  // Cek apakah user sudah login DAN rolenya adalah 'admin'
  if (req.session.user && req.session.role === 'admin') {
    // Jika ya, izinkan akses
    return next();
  } else {
    // Jika tidak, tolak akses
    res.status(403).send("<h1>403 Forbidden</h1><p>Akses ditolak. Halaman ini khusus untuk Admin.</p>");
  }
};

module.exports = { isAdmin };