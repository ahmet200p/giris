const jwt = require('jsonwebtoken');
const env = require('../config/env');
const prisma = require('../config/prisma');
const { errorResponse } = require('../utils/response');

/**
 * Temel Token Dogrulayici Middleware
 * Header'daki Authorization: Bearer <token> seklindeki degeri cozer.
 */
async function verifyToken(req, res, next) {
  try {
    const authHeader = req.headers.authorization || req.headers.Authorization;

    if (!authHeader) {
      return errorResponse(res, 'Yetkilendirme basligi (Authorization) bulunamadi.', 401);
    }

    const parts = authHeader.split(' ');
    if (parts.length !== 2 || parts[0] !== 'Bearer') {
      return errorResponse(res, 'Gecersiz yetkilendirme formati. Beklenen: Bearer <token>', 401);
    }

    const token = parts[1];

    let decoded;
    try {
      decoded = jwt.verify(token, env.JWT_SECRET);
    } catch (err) {
      if (err.name === 'TokenExpiredError') {
        return errorResponse(res, 'Oturum suresi doldu. Lutfen tekrar giris yapiniz.', 401);
      }
      return errorResponse(res, 'Gecersiz veya bozuk guvenlik tokeni.', 401);
    }

    // Token icerisindeki role kontrolu
    if (!decoded || !decoded.role) {
      return errorResponse(res, 'Token iceriginde rol (role) tanimi bulunamadi.', 403);
    }

    // Kullanicinin veritabaninda aktif olup olmadigini teyit et
    const user = await prisma.user.findUnique({
      where: { id: decoded.id },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        companyName: true,
        isActive: true
      }
    });

    if (!user) {
      return errorResponse(res, 'Bu tokene ait kullanici hesabi bulunamadi.', 401);
    }

    if (!user.isActive) {
      return errorResponse(res, 'Hesabiniz askiya alinmistir. Yonetici ile iletisime geciniz.', 403);
    }

    // Request nesnesine dogrulanmis kullaniciyi ekle
    req.user = user;
    next();
  } catch (err) {
    console.error('[verifyToken Middleware Hatasi]:', err);
    return errorResponse(res, 'Kimlik dogrulama sirasinda sunucu hatasi olustu.', 500);
  }
}

/**
 * ADIM 2: ADMIN YETKI MIDDLEWARE'I
 * Sadece 'ADMIN' rolune sahip kullanicilarin erisimine izin verir.
 */
async function verifyAdmin(req, res, next) {
  // Eger onceki middleware req.user'i doldurmadiysa token'i dogrula
  if (!req.user) {
    return verifyToken(req, res, () => {
      checkAdminRole(req, res, next);
    });
  }
  return checkAdminRole(req, res, next);
}

function checkAdminRole(req, res, next) {
  if (req.user.role !== 'ADMIN') {
    return errorResponse(res, 'Erisim Reddedildi: Bu islem sadece ADMIN (Yonetici) yetkisi gerektirir.', 403);
  }
  next();
}

/**
 * ADIM 2: BAYI YETKI MIDDLEWARE'I
 * Sadece 'BAYI' rolune sahip kullanicilarin erisimine izin verir.
 */
async function verifyBayi(req, res, next) {
  if (!req.user) {
    return verifyToken(req, res, () => {
      checkBayiRole(req, res, next);
    });
  }
  return checkBayiRole(req, res, next);
}

function checkBayiRole(req, res, next) {
  if (req.user.role !== 'BAYI') {
    return errorResponse(res, 'Erisim Reddedildi: Bu islem sadece BAYI (Satici) yetkisi gerektirir.', 403);
  }
  next();
}

/**
 * ADIM 2: MUSTERI YETKI MIDDLEWARE'I
 * Sadece 'MUSTERI' rolune sahip (B2B alici) kullanicilarin erisimine izin verir.
 */
async function verifyMusteri(req, res, next) {
  if (!req.user) {
    return verifyToken(req, res, () => {
      checkMusteriRole(req, res, next);
    });
  }
  return checkMusteriRole(req, res, next);
}

function checkMusteriRole(req, res, next) {
  if (req.user.role !== 'MUSTERI') {
    return errorResponse(res, 'Erisim Reddedildi: Bu islem sadece MUSTERI (B2B Alici) yetkisi gerektirir.', 403);
  }
  next();
}

/**
 * PANEL YETKI ORTAK MIDDLEWARE'I (Admin veya Bayi)
 */
async function verifyPanel(req, res, next) {
  if (!req.user) {
    return verifyToken(req, res, () => {
      checkPanelRole(req, res, next);
    });
  }
  return checkPanelRole(req, res, next);
}

function checkPanelRole(req, res, next) {
  if (req.user.role !== 'ADMIN' && req.user.role !== 'BAYI') {
    return errorResponse(res, 'Erisim Reddedildi: Sadece Admin ve Bayi hesaplari panele erisebilir.', 403);
  }
  next();
}

/**
 * Istege Bagli (Optional) Token Middleware'i
 * Store vitrininde anonim kullanicilarin da sepete bakabilmesi veya
 * token varsa kullanici bilgisiyle zenginlestirilmesi icin.
 */
async function optionalToken(req, res, next) {
  const authHeader = req.headers.authorization || req.headers.Authorization;
  if (!authHeader) {
    req.user = null;
    return next();
  }

  const parts = authHeader.split(' ');
  if (parts.length === 2 && parts[0] === 'Bearer') {
    try {
      const decoded = jwt.verify(parts[1], env.JWT_SECRET);
      if (decoded && decoded.id) {
        const user = await prisma.user.findUnique({
          where: { id: decoded.id },
          select: { id: true, email: true, name: true, role: true, companyName: true, isActive: true }
        });
        if (user && user.isActive) {
          req.user = user;
        }
      }
    } catch (e) {
      // Hata yok sayilir, anonim devam eder
      req.user = null;
    }
  }
  next();
}

module.exports = {
  verifyToken,
  verifyAdmin,
  verifyBayi,
  verifyMusteri,
  verifyPanel,
  optionalToken
};

