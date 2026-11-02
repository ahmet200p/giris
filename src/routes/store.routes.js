const express = require('express');
const router = express.Router();
const storeController = require('../controllers/store.controller');
const { verifyMusteri, optionalToken } = require('../middleware/auth');
const validate = require('../middleware/validate');
const { z } = require('zod');

// Validasyon Semalari
const addToCartSchema = {
  body: z.object({
    productId: z.string().min(1, 'Ürün ID zorunludur.'),
    quantity: z.number().int().positive().default(1)
  })
};

const createOrderSchema = {
  body: z.object({
    items: z.array(z.object({
      productId: z.string().optional().nullable(),
      id: z.string().optional().nullable(),
      tenantProductId: z.string().optional().nullable(),
      name: z.string().optional().nullable(),
      oeNumber: z.string().optional().nullable(),
      quantity: z.number().optional().nullable(),
      qty: z.number().optional().nullable(),
      unitPrice: z.number().optional().nullable(),
      price: z.number().optional().nullable(),
      totalPrice: z.number().optional().nullable(),
      imageUrl: z.string().optional().nullable(),
      sellerName: z.string().optional().nullable()
    })).min(1, 'Sipariş için en az 1 ürün bulunmalıdır.'),
    shippingAddress: z.string().optional().nullable(),
    customerNotes: z.string().optional().nullable(),
    notes: z.string().optional().nullable()
  })
};

/**
 * ADIM 3: STORE ROUTE IZOLASYONU (/api/store/...)
 * Sadece musterilerin (store.html) erisecegi acik ve korumali endpointler
 */

// 1. Urunler ve Arama / Filtreleme (Acik)
router.get('/products', storeController.getProducts);
router.get('/products/:id', storeController.getProductById);
router.get('/categories', storeController.getCategories);

// 2. Sepet Islemleri (Musteri Yetkisi / Oturum Kontrollu)
router.get('/cart', optionalToken, storeController.getCart);
router.post('/cart', optionalToken, validate(addToCartSchema), storeController.addToCart);
router.delete('/cart/:itemId', optionalToken, storeController.removeCartItem);
router.delete('/cart', optionalToken, storeController.clearCart);

// 3. Siparis Islemleri (store.html Checkout)
router.post('/orders', optionalToken, validate(createOrderSchema), storeController.createOrder);
router.get('/orders', verifyMusteri, storeController.getCustomerOrders);

// 4. Favoriler & Bildirimler (store.html ile tam uyumlu)
router.get('/favorites', optionalToken, storeController.getFavorites);
router.post('/favorites', optionalToken, storeController.toggleFavorite);
router.get('/notifications', optionalToken, storeController.getNotifications);
router.post('/notifications/read', optionalToken, storeController.markNotificationsRead);
router.post('/notifications/trigger', optionalToken, storeController.triggerNotification);

module.exports = router;
