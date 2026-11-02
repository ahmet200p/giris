const express = require('express');
const router = express.Router();
const authController = require('../controllers/auth.controller');
const { verifyToken } = require('../middleware/auth');
const validate = require('../middleware/validate');
const { z } = require('zod');

// Validasyon Semalari
const loginSchema = {
  body: z.object({
    email: z.string().email('Gecerli bir e-posta adresi giriniz.'),
    password: z.string().min(4, 'Sifre en az 4 karakter olmalidir.')
  })
};

const storeRegisterSchema = {
  body: z.object({
    email: z.string().email('Gecerli bir e-posta adresi giriniz.'),
    password: z.string().min(6, 'Sifre en az 6 karakter olmalidir.'),
    name: z.string().min(2, 'Ad Soyad en az 2 karakter olmalidir.'),
    companyName: z.string().optional(),
    taxNumber: z.string().optional(),
    taxOffice: z.string().optional(),
    city: z.string().optional(),
    address: z.string().optional(),
    phone: z.string().optional()
  })
};

const bayiRegisterSchema = {
  body: z.object({
    email: z.string().email('Gecerli bir e-posta adresi giriniz.'),
    password: z.string().min(6, 'Sifre en az 6 karakter olmalidir.'),
    name: z.string().min(2, 'Yetkili adi en az 2 karakter olmalidir.'),
    companyName: z.string().min(2, 'Sirket unvani en az 2 karakter olmalidir.'),
    taxNumber: z.string().optional(),
    taxOffice: z.string().optional(),
    city: z.string().optional(),
    phone: z.string().optional()
  })
};

/**
 * ADIM 2: CIFT GIRISLI AUTH ROUTING
 */
// 1. Admin & Bayi Girisi (Sadece ADMIN ve BAYI)
router.post('/panel-login', validate(loginSchema), authController.panelLogin);

// 2. Musteri Girisi (Sadece MUSTERI)
router.post('/store-login', validate(loginSchema), authController.storeLogin);

// 3. Musteri Kaydi (Magaza uzerinden)
router.post('/store-register', validate(storeRegisterSchema), authController.storeRegister);

// 4. Bayi Basvurusu / Kaydi
router.post('/bayi-register', validate(bayiRegisterSchema), authController.bayiRegister);

// 5. Token ile Profil Sorgulama
router.get('/me', verifyToken, authController.getMe);

module.exports = router;

