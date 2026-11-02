const bcrypt = require('bcryptjs');
const prisma = require('../config/prisma');
const { successResponse, errorResponse } = require('../utils/response');

/**
 * ADMIN CONTROLLER - Platform & Süper Yönetici API'leri
 * Sadece 'ADMIN' rolüne sahip kullanıcılar erişebilir.
 * Tüm sisteme (kullanıcılar, ürünler, bayiler, siparişler) müdahale yetkisine sahiptir.
 */

/**
 * 1. PLATFORM GENEL ISTATISTIKLERI (DASHBOARD)
 * GET /api/admin/stats
 */
async function getAdminStats(req, res, next) {
  try {
    const [
      totalUsers,
      bayiCount,
      musteriCount,
      adminCount,
      totalProducts,
      activeProducts,
      totalOrders,
      orders
    ] = await Promise.all([
      prisma.user.count(),
      prisma.user.count({ where: { role: 'BAYI' } }),
      prisma.user.count({ where: { role: 'MUSTERI' } }),
      prisma.user.count({ where: { role: 'ADMIN' } }),
      prisma.product.count(),
      prisma.product.count({ where: { isActive: true } }),
      prisma.order.count(),
      prisma.order.findMany({ select: { grandTotal: true, status: true } })
    ]);

    const totalRevenue = +(orders.reduce((sum, o) => sum + o.grandTotal, 0)).toFixed(2);
    const pendingOrders = orders.filter(o => o.status === 'PENDING').length;

    return successResponse(res, {
      users: {
        total: totalUsers,
        admins: adminCount,
        bayis: bayiCount,
        musteris: musteriCount
      },
      products: {
        total: totalProducts,
        active: activeProducts
      },
      orders: {
        total: totalOrders,
        pending: pendingOrders,
        totalRevenue,
        currency: 'TRY'
      }
    }, 'Sistem istatistikleri getirildi.');
  } catch (err) {
    next(err);
  }
}

/**
 * 2. KULLANICILARI LISTELEME (FILTRELI)
 * GET /api/admin/users
 */
async function getUsers(req, res, next) {
  try {
    const { role, search, isActive } = req.query;

    const where = {};
    if (role) where.role = role.toUpperCase();
    if (isActive !== undefined) where.isActive = isActive === 'true';

    if (search && search.trim()) {
      const q = search.trim();
      where.OR = [
        { name: { contains: q } },
        { email: { contains: q } },
        { companyName: { contains: q } }
      ];
    }

    const users = await prisma.user.findMany({
      where,
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        companyName: true,
        city: true,
        phone: true,
        isActive: true,
        createdAt: true,
        _count: {
          select: {
            products: true,
            orders: true
          }
        }
      },
      orderBy: { createdAt: 'desc' }
    });

    return successResponse(res, users, 'Kullanıcılar listelendi.', 200, {
      total: users.length
    });
  } catch (err) {
    next(err);
  }
}

/**
 * 3. YENI KULLANICI OLUSTURMA (ADMIN YETKISI ILE)
 * POST /api/admin/users
 */
async function createUser(req, res, next) {
  try {
    const { email, password, name, role, companyName, city, phone } = req.body;

    const existing = await prisma.user.findUnique({
      where: { email: email.toLowerCase().trim() }
    });

    if (existing) {
      return errorResponse(res, 'Bu e-posta adresiyle zaten kullanıcı kayıtlı.', 409);
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const user = await prisma.user.create({
      data: {
        email: email.toLowerCase().trim(),
        password: hashedPassword,
        name,
        role: role.toUpperCase(),
        companyName,
        city,
        phone
      },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        companyName: true,
        city: true,
        createdAt: true
      }
    });

    return successResponse(res, user, 'Kullanıcı başarıyla oluşturuldu.', 201);
  } catch (err) {
    next(err);
  }
}

/**
 * 4. KULLANICI ROLUNU DEGISTIRME (RBAC YONETIMI)
 * PATCH /api/admin/users/:id/role
 */
async function updateUserRole(req, res, next) {
  try {
    const { id } = req.params;
    const { role } = req.body;

    const validRoles = ['ADMIN', 'BAYI', 'MUSTERI'];
    if (!role || !validRoles.includes(role.toUpperCase())) {
      return errorResponse(res, `Geçersiz rol. Kabul edilen roller: ${validRoles.join(', ')}`, 400);
    }

    if (id === req.user.id && role.toUpperCase() !== 'ADMIN') {
      return errorResponse(res, 'Kendi yönetici rolünüzü değiştiremezsiniz.', 400);
    }

    const updated = await prisma.user.update({
      where: { id },
      data: { role: role.toUpperCase() },
      select: { id: true, email: true, name: true, role: true }
    });

    return successResponse(res, updated, `Kullanıcı rolü ${role.toUpperCase()} olarak güncellendi.`);
  } catch (err) {
    next(err);
  }
}

/**
 * 5. KULLANICI AKTIF/PASIF DURUMUNU DEGISTIRME
 * PATCH /api/admin/users/:id/status
 */
async function updateUserStatus(req, res, next) {
  try {
    const { id } = req.params;
    const { isActive } = req.body;

    if (typeof isActive !== 'boolean') {
      return errorResponse(res, 'isActive alanı boolean (true/false) olmalıdır.', 400);
    }

    if (id === req.user.id && !isActive) {
      return errorResponse(res, 'Kendi hesabınızı askıya alamazsınız.', 400);
    }

    const updated = await prisma.user.update({
      where: { id },
      data: { isActive },
      select: { id: true, email: true, name: true, isActive: true }
    });

    return successResponse(res, updated, `Kullanıcı durumu ${isActive ? 'Aktif' : 'Pasif'} yapıldı.`);
  } catch (err) {
    next(err);
  }
}

/**
 * 6. KULLANICI SILME
 * DELETE /api/admin/users/:id
 */
async function deleteUser(req, res, next) {
  try {
    const { id } = req.params;

    if (id === req.user.id) {
      return errorResponse(res, 'Kendi hesabınızı silemezsiniz.', 400);
    }

    await prisma.user.delete({ where: { id } });

    return successResponse(res, null, 'Kullanıcı hesabı başarıyla silindi.');
  } catch (err) {
    next(err);
  }
}

/**
 * 7. TUM SISTEMDEKI URUNLERI DENETLEME
 * GET /api/admin/products
 */
async function getAllProducts(req, res, next) {
  try {
    const products = await prisma.product.findMany({
      include: {
        bayi: {
          select: { id: true, name: true, companyName: true, email: true, city: true }
        }
      },
      orderBy: { createdAt: 'desc' }
    });

    return successResponse(res, products, 'Tüm sistem ürünleri listelendi.', 200, {
      total: products.length
    });
  } catch (err) {
    next(err);
  }
}

/**
 * 8. ADMININ HERHANGI BIR URUNU SILMESI / MODERE ETMESI
 * DELETE /api/admin/products/:id
 */
async function deleteProduct(req, res, next) {
  try {
    const { id } = req.params;
    await prisma.product.delete({ where: { id } });
    return successResponse(res, null, 'Ürün sistemden tamamen kaldırıldı.');
  } catch (err) {
    next(err);
  }
}

/**
 * 9. TUM SISTEM SIPARISLERI
 * GET /api/admin/orders
 */
async function getAllOrders(req, res, next) {
  try {
    const orders = await prisma.order.findMany({
      include: {
        user: {
          select: { id: true, name: true, email: true, companyName: true, phone: true }
        },
        items: true
      },
      orderBy: { createdAt: 'desc' }
    });

    return successResponse(res, orders, 'Tüm platform siparişleri listelendi.', 200, {
      total: orders.length
    });
  } catch (err) {
    next(err);
  }
}

/**
 * 10. SIPARIS DURUMU MUDAHALESI
 * PATCH /api/admin/orders/:id/status
 */
async function updateOrderStatus(req, res, next) {
  try {
    const { id } = req.params;
    const { status } = req.body;

    const validStatuses = ['PENDING', 'CONFIRMED', 'PREPARING', 'SHIPPED', 'DELIVERED', 'CANCELLED'];
    if (!status || !validStatuses.includes(status)) {
      return errorResponse(res, `Geçersiz durum. Kabul edilenler: ${validStatuses.join(', ')}`, 400);
    }

    const updated = await prisma.order.update({
      where: { id },
      data: { status }
    });

    return successResponse(res, updated, `Sipariş durumu ${status} olarak güncellendi.`);
  } catch (err) {
    next(err);
  }
}

module.exports = {
  getAdminStats,
  getUsers,
  createUser,
  updateUserRole,
  updateUserStatus,
  deleteUser,
  getAllProducts,
  deleteProduct,
  getAllOrders,
  updateOrderStatus
};

