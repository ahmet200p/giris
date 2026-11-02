// Standardized API Response Helper

function successResponse(res, data = null, message = 'İşlem başarılı', statusCode = 200, extra = {}) {
  return res.status(statusCode).json({
    success: true,
    message,
    data,
    ...extra
  });
}

function errorResponse(res, message = 'Bir hata oluştu', statusCode = 500, errors = null) {
  const payload = {
    success: false,
    message
  };

  if (errors) {
    payload.errors = errors;
  }

  return res.status(statusCode).json(payload);
}

module.exports = {
  successResponse,
  errorResponse
};

