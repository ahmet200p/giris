const { errorResponse } = require('../utils/response');

/**
 * Zod Schema Dogrulayici Middleware
 */
function validate(schema) {
  return async (req, res, next) => {
    try {
      if (schema.body) {
        req.body = await schema.body.parseAsync(req.body);
      }
      if (schema.query) {
        req.query = await schema.query.parseAsync(req.query);
      }
      if (schema.params) {
        req.params = await schema.params.parseAsync(req.params);
      }
      next();
    } catch (err) {
      if (err.name === 'ZodError') {
        const errors = err.errors.map(e => ({
          field: e.path.join('.'),
          message: e.message
        }));
        return errorResponse(res, 'Validasyon hatasi: Girilen verileri kontrol ediniz.', 400, errors);
      }
      next(err);
    }
  };
}

module.exports = validate;

