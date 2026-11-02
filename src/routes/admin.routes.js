const express = require('express');
const router = express.Router();
const adminController = require('../controllers/admin.controller');
const { verifyAdmin } = require('../middleware/auth');
const validate = require('../middleware/validate');
const { z } = require('zod');

// Validasyon Semalari
const createUserSchema = {
  body: z.object({
    email: z.string().email('Geçerli bir e-posta adresi giriniz.'),
    password: z.string().min(6, 'Şifre en az 6 karakter olmalıdır.'),
    name: z.string().min(2, 'İsim en az 2 karakter olmalıdır.'),
    role: z.enum(['ADMIN', 'BAYI', 'MUSTERI']),
    companyName: z.string().optional(),
    city: z.string().optional(),
    phone: z.string().optional()
  })
};

const updateRoleSchema = {
  body: z.object({
    role: z.enum(['ADMIN', 'BAYI', 'MUSTERI'])
  })
};

const updateStatusSchema = {
  body: z.object({
    isActive: z.boolean()
  })
};

/**
 * ADIM 3: ADMIN ROUTE IZOLASYONU (/api/admin/...)
 * Sadece 'ADMIN' rolune sahip kullanicilar erisebilir.
 */
router.use(verifyAdmin);

// Sistem Dashboard ve Istatistikleri
router.get('/stats', adminController.getAdminStats);

// Kullanici Yonetimi
router.get('/users', adminController.getUsers);
router.post('/users', validate(createUserSchema), adminController.createUser);
router.patch('/users/:id/role', validate(updateRoleSchema), adminController.updateUserRole);
router.patch('/users/:id/status', validate(updateStatusSchema), adminController.updateUserStatus);
router.delete('/users/:id', adminController.deleteUser);

// Urun Moderasyonu
router.get('/products', adminController.getAllProducts);
router.delete('/products/:id', adminController.deleteProduct);

// Siparis Denetimi
router.get('/orders', adminController.getAllOrders);
router.patch('/orders/:id/status', adminController.updateOrderStatus);

module.exports = router;

