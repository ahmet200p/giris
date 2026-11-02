const jwt = require('jsonwebtoken');
const env = require('../config/env');

/**
 * JWT Token Uretici
 * Kural (prompt.md Adim 2): Payload kismina kesinlikle kullanicinin `role` bilgisi eklenmelidir.
 */
function generateToken(user) {
  const payload = {
    id: user.id,
    email: user.email,
    name: user.name,
    role: user.role, // 'ADMIN' | 'BAYI' | 'MUSTERI'
    companyName: user.companyName || null
  };

  return jwt.sign(payload, env.JWT_SECRET, {
    expiresIn: env.JWT_EXPIRES_IN
  });
}

/**
 * JWT Token Cozucu & Dogrulayici
 */
function verifyTokenString(token) {
  try {
    return jwt.verify(token, env.JWT_SECRET);
  } catch (err) {
    return null;
  }
}

module.exports = {
  generateToken,
  verifyTokenString
};

