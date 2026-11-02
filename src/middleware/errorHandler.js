const { errorResponse } = require('../utils/response');

function errorHandler(err, req, res, next) {
  console.error('[HATA DETAYI]:', {
    message: err.message,
    stack: process.env.NODE_ENV === 'development' ? err.stack : undefined,
    path: req.originalUrl,
    method: req.method
  });

  // Prisma Hata Yonetimi
  if (err.code === 'P2002') {
    const target = (err.meta && err.meta.target) ? err.meta.target.join(', ') : 'Belirtilen alan';
    return errorResponse(res, `Bu ${target} zaten baska bir kayit tarafindan kullanilmaktadir.`, 409);
  }

  if (err.code === 'P2025') {
    return errorResponse(res, 'Istenen kayit veritabaninda bulunamadi.', 404);
  }

  // Zod Dogrulama Hatasi
  if (err.name === 'ZodError') {
    const issues = err.issues.map(i => ({
      path: i.path.join('.'),
      message: i.message
    }));
    return errorResponse(res, 'Gonderilen veriler formata uygun degil.', 400, issues);
  }

  // Genel Sunucu Hatasi
  const statusCode = err.status || err.statusCode || 500;
  const message = err.message || 'Sunucu tarafinda beklenmeyen bir hata olustu.';

  return errorResponse(res, message, statusCode);
}

module.exports = errorHandler;

