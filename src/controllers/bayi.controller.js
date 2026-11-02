const prisma = require('../config/prisma');
const { successResponse, errorResponse } = require('../utils/response');

/**
 * BAYI CONTROLLER - Satici & Bayi Yonetim API'leri
 * Sadece 'BAYI' rolune sahip yetkilendirilmis kullanicilar erisebilir.
 * Her bayi YALNIZCA kendi urunlerini, stoklarini ve siparislerini gorebilir ve duzenleyebilir.
 */

/**
 * 1. BAYININ KENDI URUNLERINI LISTELEMESI
 * GET /api/bayi/products
 */
async function getBayiProducts(req, res, next) {
  try {
    const bayiId = req.user.id;
    const { search, category, lowStock } = req.query;

    const where = {
      bayiId
    };

    if (category) {
      where.category = category;
    }

    if (lowStock === 'true') {
      where.stock = { lte: 5 };
    }

    if (search && search.trim()) {
      const q = search.trim();
      where.OR = [
        { name: { contains: q } },
        { oemCode: { contains: q } },
        { brand: { contains: q } }
      ];
    }

    const products = await prisma.product.findMany({
      where,
      orderBy: { createdAt: 'desc' }
    });

    return successResponse(res, products, 'Bayi urunleri listelendi.', 200, {
      total: products.length
    });
  } catch (err) {
    next(err);
  }
}

/**
 * 2. BAYININ YENI URUN EKLEMESI
 * POST /api/bayi/products
 */
async function createBayiProduct(req, res, next) {
  try {
    const bayiId = req.user.id;
    const {
      name,
      oemCode,
      brand,
      category,
      subcategory,
      compatibleModels,
      price,
      discountedPrice,
      stock,
      imageUrl,
      description,
      specPill,
      shippingText
    } = req.body;

    const newProduct = await prisma.product.create({
      data: {
        name,
        oemCode,
        brand: (brand || 'OEM').toUpperCase(),
        category,
        subcategory,
        compatibleModels,
        price: parseFloat(price),
        discountedPrice: discountedPrice ? parseFloat(discountedPrice) : null,
        stock: parseInt(stock || 0, 10),
        imageUrl,
        description,
        specPill,
        shippingText: shippingText || 'Aynı Gün Kargo',
        bayiId // Bayi sahipligi otomatik baglanir
      }
    });

    return successResponse(res, newProduct, 'Ürün başarıyla eklendi.', 201);
  } catch (err) {
    next(err);
  }
}

/**
 * 3. BAYININ TEK BIR URUNUNU GETIRMESI
 * GET /api/bayi/products/:id
 */
async function getBayiProductById(req, res, next) {
  try {
    const bayiId = req.user.id;
    const { id } = req.params;

    const product = await prisma.product.findFirst({
      where: { id, bayiId }
    });

    if (!product) {
      return errorResponse(res, 'Ürün bulunamadı veya bu ürüne erişim yetkiniz yok.', 404);
    }

    return successResponse(res, product, 'Ürün bilgisi getirildi.');
  } catch (err) {
    next(err);
  }
}

/**
 * 4. BAYININ URUNUNU GUNLLEMESI
 * PUT /api/bayi/products/:id
 */
async function updateBayiProduct(req, res, next) {
  try {
    const bayiId = req.user.id;
    const { id } = req.params;

    // Urunun bu bayiye ait oldugunu dogrula
    const existing = await prisma.product.findFirst({
      where: { id, bayiId }
    });

    if (!existing) {
      return errorResponse(res, 'Güncellenecek ürün bulunamadı veya yetkiniz yok.', 404);
    }

    const {
      name,
      oemCode,
      brand,
      category,
      subcategory,
      compatibleModels,
      price,
      discountedPrice,
      stock,
      imageUrl,
      description,
      specPill,
      shippingText,
      isActive
    } = req.body;

    const updated = await prisma.product.update({
      where: { id },
      data: {
        ...(name && { name }),
        ...(oemCode && { oemCode }),
        ...(brand && { brand: brand.toUpperCase() }),
        ...(category && { category }),
        ...(subcategory !== undefined && { subcategory }),
        ...(compatibleModels !== undefined && { compatibleModels }),
        ...(price !== undefined && { price: parseFloat(price) }),
        ...(discountedPrice !== undefined && { discountedPrice: discountedPrice ? parseFloat(discountedPrice) : null }),
        ...(stock !== undefined && { stock: parseInt(stock, 10) }),
        ...(imageUrl !== undefined && { imageUrl }),
        ...(description !== undefined && { description }),
        ...(specPill !== undefined && { specPill }),
        ...(shippingText !== undefined && { shippingText }),
        ...(isActive !== undefined && { isActive: Boolean(isActive) })
      }
    });

    return successResponse(res, updated, 'Ürün başarıyla güncellendi.');
  } catch (err) {
    next(err);
  }
}

/**
 * 5. BAYI STOK YONETIMI (HIZLI STOK GUNCELLEME)
 * PATCH /api/bayi/products/:id/stock
 */
async function updateProductStock(req, res, next) {
  try {
    const bayiId = req.user.id;
    const { id } = req.params;
    const { stock } = req.body;

    if (stock === undefined || isNaN(parseInt(stock, 10)) || parseInt(stock, 10) < 0) {
      return errorResponse(res, 'Geçerli bir stok adedi giriniz (0 veya daha büyük tam sayı).', 400);
    }

    const existing = await prisma.product.findFirst({
      where: { id, bayiId }
    });

    if (!existing) {
      return errorResponse(res, 'Ürün bulunamadı veya yetkiniz yok.', 404);
    }

    const updated = await prisma.product.update({
      where: { id },
      data: {
        stock: parseInt(stock, 10)
      }
    });

    return successResponse(res, { id: updated.id, stock: updated.stock }, 'Ürün stoku başarıyla güncellendi.');
  } catch (err) {
    next(err);
  }
}

/**
 * 6. BAYININ KENDI URUNUNU SILMESI
 * DELETE /api/bayi/products/:id
 */
async function deleteBayiProduct(req, res, next) {
  try {
    const bayiId = req.user.id;
    const { id } = req.params;

    const existing = await prisma.product.findFirst({
      where: { id, bayiId }
    });

    if (!existing) {
      return errorResponse(res, 'Silinecek ürün bulunamadı veya yetkiniz yok.', 404);
    }

    await prisma.product.delete({
      where: { id }
    });

    return successResponse(res, null, 'Ürün başarıyla silindi.');
  } catch (err) {
    next(err);
  }
}

/**
 * 7. BAYININ GELEN SIPARISLERI (Sadece kendi urunlerini icerenler)
 * GET /api/bayi/orders
 */
async function getBayiOrders(req, res, next) {
  try {
    const bayiId = req.user.id;

    // Bu bayinin urunlerini iceren siparis kalemlerini ve siparisleri bul
    const orders = await prisma.order.findMany({
      where: {
        items: {
          some: {
            bayiId
          }
        }
      },
      include: {
        user: {
          select: { id: true, name: true, companyName: true, phone: true, city: true }
        },
        items: {
          where: { bayiId }
        }
      },
      orderBy: { createdAt: 'desc' }
    });

    return successResponse(res, orders, 'Bayiye ait siparişler listelendi.');
  } catch (err) {
    next(err);
  }
}

/**
 * 8. BAYININ SIPARIS DURUMUNU GUNCELLEMESI
 * PATCH /api/bayi/orders/:orderId/status
 */
async function updateBayiOrderStatus(req, res, next) {
  try {
    const bayiId = req.user.id;
    const { orderId } = req.params;
    const { status } = req.body;

    const validStatuses = ['PENDING', 'CONFIRMED', 'PREPARING', 'SHIPPED', 'DELIVERED', 'CANCELLED'];
    if (!status || !validStatuses.includes(status)) {
      return errorResponse(res, `Geçersiz sipariş durumu. Kabul edilenler: ${validStatuses.join(', ')}`, 400);
    }

    const order = await prisma.order.findFirst({
      where: {
        id: orderId,
        items: { some: { bayiId } }
      }
    });

    if (!order) {
      return errorResponse(res, 'Sipariş bulunamadı veya bu siparişte ürününüz yok.', 404);
    }

    const updated = await prisma.order.update({
      where: { id: orderId },
      data: { status }
    });

    return successResponse(res, updated, `Sipariş durumu ${status} olarak güncellendi.`);
  } catch (err) {
    next(err);
  }
}

/**
 * 9. BAYI PANELI KPI VE ISTATISTIKLERI
 * GET /api/bayi/stats
 */
async function getBayiStats(req, res, next) {
  try {
    const bayiId = req.user.id;

    const [totalProducts, lowStockProducts, orderItems] = await Promise.all([
      prisma.product.count({ where: { bayiId, isActive: true } }),
      prisma.product.count({ where: { bayiId, isActive: true, stock: { lte: 5 } } }),
      prisma.orderItem.findMany({
        where: { bayiId },
        select: { quantity: true, totalPrice: true }
      })
    ]);

    const totalSoldUnits = orderItems.reduce((acc, curr) => acc + curr.quantity, 0);
    const totalEarnings = +(orderItems.reduce((acc, curr) => acc + curr.totalPrice, 0)).toFixed(2);

    return successResponse(res, {
      totalProducts,
      lowStockProducts,
      totalSoldUnits,
      totalEarnings,
      currency: 'TRY'
    }, 'Bayi istatistikleri getirildi.');
  } catch (err) {
    next(err);
  }
}

module.exports = {
  getBayiProducts,
  createBayiProduct,
  getBayiProductById,
  updateBayiProduct,
  updateProductStock,
  deleteBayiProduct,
  getBayiOrders,
  updateBayiOrderStatus,
  getBayiStats
};

