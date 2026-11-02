const bcrypt = require('bcryptjs');
const prisma = require('../config/prisma');
const { generateToken } = require('../utils/jwt');
const { successResponse, errorResponse } = require('../utils/response');

/**
 * ADIM 2: PANEL LOGIN (Admin & Bayi Icin Cift Kapili Giris)
 * POST /api/auth/panel-login
 * SADECE 'ADMIN' ve 'BAYI' rollerinin girisine izin verir.
 * Musteri (B2B alici) hesaplarina KESINLIKLE izin vermez ve 403 doner.
 */
async function panelLogin(req, res, next) {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return errorResponse(res, 'E-posta ve sifre alanlari zorunludur.', 400);
    }

    const user = await prisma.user.findUnique({
      where: { email: email.toLowerCase().trim() }
    });

    if (!user) {
      return errorResponse(res, 'Gecersiz e-posta veya sifre.', 401);
    }

    if (!user.isActive) {
      return errorResponse(res, 'Hesabiniz askiya alinmistir. Yonetici ile iletisime geciniz.', 403);
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return errorResponse(res, 'Gecersiz e-posta veya sifre.', 401);
    }

    // Role Kontrolu: Panel girisi sadece ADMIN ve BAYI icindir
    if (user.role === 'MUSTERI') {
      return errorResponse(
        res,
        'Yetkisiz Giris: Musteri hesaplari yonetim paneline giris yapamaz. Lutfen magaza girisini (store.html) kullaniniz.',
        403
      );
    }

    // JWT Payload icine 'role' eklenir (prompt.md Adim 2 kurali)
    const token = generateToken(user);

    return successResponse(
      res,
      {
        token,
        user: {
          id: user.id,
          name: user.name,
          email: user.email,
          role: user.role,
          companyName: user.companyName,
          city: user.city
        }
      },
      `${user.role === 'ADMIN' ? 'Yonetici' : 'Bayi'} paneline basariyla giris yapildi.`
    );
  } catch (err) {
    next(err);
  }
}

/**
 * ADIM 2: STORE LOGIN (Musteriler / B2B Alicilar Icin Giris)
 * POST /api/auth/store-login
 * SADECE 'MUSTERI' rolundeki B2B alicilarin girisine izin verir.
 * Admin veya Bayi hesaplarinin magaza musteri girisinden yetki karmasasi yaratmasini onler.
 */
async function storeLogin(req, res, next) {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return errorResponse(res, 'E-posta ve sifre alanlari zorunludur.', 400);
    }

    const user = await prisma.user.findUnique({
      where: { email: email.toLowerCase().trim() }
    });

    if (!user) {
      return errorResponse(res, 'Gecersiz e-posta veya sifre.', 401);
    }

    if (!user.isActive) {
      return errorResponse(res, 'Hesabiniz askiya alinmistir.', 403);
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return errorResponse(res, 'Gecersiz e-posta veya sifre.', 401);
    }

    // Role Kontrolu: Magaza girisi sadece MUSTERI icindir
    if (user.role !== 'MUSTERI') {
      return errorResponse(
        res,
        'Bu hesap yonetici veya bayi statüsündedir. Lutfen Panel Girisini (panel-login) kullaniniz.',
        403
      );
    }

    // JWT Payload icine 'role' eklenir (prompt.md Adim 2 kurali)
    const token = generateToken(user);

    return successResponse(
      res,
      {
        token,
        user: {
          id: user.id,
          name: user.name,
          email: user.email,
          role: user.role,
          companyName: user.companyName,
          city: user.city
        }
      },
      'Magazaya basariyla giris yapildi.'
    );
  } catch (err) {
    next(err);
  }
}

/**
 * MUSTERI KAYDI (Magazadan B2B Alici Kaydi)
 * POST /api/auth/store-register
 */
async function storeRegister(req, res, next) {
  try {
    const { email, password, name, companyName, taxNumber, taxOffice, city, address, phone } = req.body;

    if (!email || !password || !name) {
      return errorResponse(res, 'E-posta, sifre ve isim alanlari zorunludur.', 400);
    }

    const existingUser = await prisma.user.findUnique({
      where: { email: email.toLowerCase().trim() }
    });

    if (existingUser) {
      return errorResponse(res, 'Bu e-posta adresiyle zaten kayitli bir hesap bulunmaktadir.', 409);
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const newUser = await prisma.user.create({
      data: {
        email: email.toLowerCase().trim(),
        password: hashedPassword,
        name,
        companyName,
        taxNumber,
        taxOffice,
        city,
        address,
        phone,
        role: 'MUSTERI' // Zorunlu MUSTERI rolu
      }
    });

    // Kullanici icin baslangic sepeti olustur
    await prisma.cart.create({
      data: { userId: newUser.id }
    });

    const token = generateToken(newUser);

    return successResponse(
      res,
      {
        token,
        user: {
          id: newUser.id,
          name: newUser.name,
          email: newUser.email,
          role: newUser.role,
          companyName: newUser.companyName
        }
      },
      'Musteri kaydi basariyla tamamlandi.',
      201
    );
  } catch (err) {
    next(err);
  }
}

/**
 * BAYI KAYDI / BASVURUSU
 * POST /api/auth/bayi-register
 */
async function bayiRegister(req, res, next) {
  try {
    const { email, password, name, companyName, taxNumber, taxOffice, city, phone } = req.body;

    if (!email || !password || !name || !companyName) {
      return errorResponse(res, 'E-posta, sifre, yetkili adi ve sirket unvani zorunludur.', 400);
    }

    const existingUser = await prisma.user.findUnique({
      where: { email: email.toLowerCase().trim() }
    });

    if (existingUser) {
      return errorResponse(res, 'Bu e-posta adresiyle zaten kayitli bir hesap bulunmaktadir.', 409);
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const newBayi = await prisma.user.create({
      data: {
        email: email.toLowerCase().trim(),
        password: hashedPassword,
        name,
        companyName,
        taxNumber,
        taxOffice,
        city,
        phone,
        role: 'BAYI' // Zorunlu BAYI rolu
      }
    });

    const token = generateToken(newBayi);

    return successResponse(
      res,
      {
        token,
        user: {
          id: newBayi.id,
          name: newBayi.name,
          email: newBayi.email,
          role: newBayi.role,
          companyName: newBayi.companyName
        }
      },
      'Bayi hesabi basariyla olusturuldu.',
      201
    );
  } catch (err) {
    next(err);
  }
}

/**
 * MEVCUT KULLANICI PROFILI (TOKEN ILE)
 * GET /api/auth/me
 */
async function getMe(req, res, next) {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user.id },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        companyName: true,
        taxNumber: true,
        taxOffice: true,
        city: true,
        address: true,
        phone: true,
        createdAt: true
      }
    });

    return successResponse(res, user, 'Kullanici profili getirildi.');
  } catch (err) {
    next(err);
  }
}

module.exports = {
  panelLogin,
  storeLogin,
  storeRegister,
  bayiRegister,
  getMe
};

