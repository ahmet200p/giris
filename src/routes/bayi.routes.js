const express = require('express');
const router = express.Router();
const bayiController = require('../controllers/bayi.controller');
const { verifyBayi } = require('../middleware/auth');
const validate = require('../middleware/validate');
const { z } = require('zod');

// Validasyon Semalari
const createProductSchema = {
  body: z.object({
    name: z.string().min(2, 'Ürün adı en az 2 karakter olmalıdır.'),
    oemCode: z.string().min(2, 'OEM parça kodu zorunludur.'),
    brand: z.string().min(1, 'Marka adı zorunludur.'),
    category: z.string().min(1, 'Kategori zorunludur.'),
    subcategory: z.string().optional(),
    compatibleModels: z.string().optional(),
    price: z.number().positive('Fiyat 0\'dan büyük olmalıdır.'),
    discountedPrice: z.number().positive().optional().nullable(),
    stock: z.number().int().min(0, 'Stok 0 veya daha büyük olmalıdır.').default(0),
    imageUrl: z.string().optional().nullable(),
    description: z.string().optional().nullable(),
    specPill: z.string().optional().nullable(),
    shippingText: z.string().optional().nullable()
  })
};

const updateStockSchema = {
  body: z.object({
    stock: z.number().int().min(0, 'Stok adedi negatif olamaz.')
  })
};

/**
 * ADIM 3: BAYI ROUTE IZOLASYONU (/api/bayi/...)
 * Sadece BAYI rolune sahip kullanicilar erisebilir.
 */
router.use(verifyBayi);

// Urun Yonetimi
router.get('/products', bayiController.getBayiProducts);
router.post('/products', validate(createProductSchema), bayiController.createBayiProduct);
router.get('/products/:id', bayiController.getBayiProductById);
router.put('/products/:id', bayiController.updateBayiProduct);
router.patch('/products/:id/stock', validate(updateStockSchema), bayiController.updateProductStock);
router.delete('/products/:id', bayiController.deleteBayiProduct);

// Siparis ve Performans Yonetimi
router.get('/orders', bayiController.getBayiOrders);
router.patch('/orders/:orderId/status', bayiController.updateBayiOrderStatus);
router.get('/stats', bayiController.getBayiStats);

module.exports = router;

