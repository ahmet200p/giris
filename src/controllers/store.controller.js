const prisma = require('../config/prisma');
const { successResponse, errorResponse } = require('../utils/response');

/**
 * STORE CONTROLLER - Müşteri & Headless Vitrin API'leri
 * Sadece musterilerin veya acik katalog ziyaretcilerinin eristigi fonksiyonlar
 */

/**
 * 1. URUNLERI LISTELEME & AKILLI FILTRELEME (GET /api/store/products)
 * store.html'deki tum arama, OEM kodu, kategori, marka ve fiyat filtrelerini destekler
 */
async function getProducts(req, res, next) {
  try {
    const {
      category,
      brand,
      brands,
      subcategory,
      search,
      searchType,
      minPrice,
      maxPrice,
      inStock,
      page = 1,
      limit = 50,
      sort
    } = req.query;

    const where = {
      isActive: true
    };

    // Kategori Filtresi
    if (category && category !== 'ALL' && category !== 'Tüm Kategoriler' && category !== 'Tum Kategoriler') {
      where.category = { equals: category };
    }

    // Marka Filtresi (Tekli veya Virgullu Coklu Marka)
    const brandList = [];
    if (brand) brandList.push(...brand.split(',').map(b => b.trim()));
    if (brands) brandList.push(...brands.split(',').map(b => b.trim()));

    if (brandList.length > 0) {
      where.brand = { in: brandList };
    }

    // Alt Kategori Filtresi
    if (subcategory) {
      const subList = subcategory.split(',').map(s => s.trim());
      where.subcategory = { in: subList };
    }

    // Arama Sorgusu (Search Box / OEM Code)
    if (search && search.trim()) {
      const q = search.trim();
      if (searchType === 'oe') {
        where.oemCode = { contains: q };
      } else {
        where.OR = [
          { name: { contains: q } },
          { oemCode: { contains: q } },
          { brand: { contains: q } },
          { category: { contains: q } },
          { compatibleModels: { contains: q } }
        ];
      }
    }

    // Fiyat Araligi
    if (minPrice || maxPrice) {
      where.price = {};
      if (minPrice && !isNaN(parseFloat(minPrice))) {
        where.price.gte = parseFloat(minPrice);
      }
      if (maxPrice && !isNaN(parseFloat(maxPrice))) {
        where.price.lte = parseFloat(maxPrice);
      }
    }

    // Stok Durumu
    if (inStock === 'true' || inStock === true) {
      where.stock = { gt: 0 };
    }

    // Siralama (Sorting)
    let orderBy = { createdAt: 'desc' };
    if (sort === 'price_asc') orderBy = { price: 'asc' };
    else if (sort === 'price_desc') orderBy = { price: 'desc' };
    else if (sort === 'name_asc') orderBy = { name: 'asc' };

    const take = parseInt(limit, 10);
    const skip = (parseInt(page, 10) - 1) * take;

    const [products, totalCount] = await Promise.all([
      prisma.product.findMany({
        where,
        include: {
          bayi: {
            select: {
              id: true,
              name: true,
              companyName: true,
              city: true
            }
          }
        },
        orderBy,
        skip,
        take
      }),
      prisma.product.count({ where })
    ]);

    // store.html UI ile %100 uyumlu alanlar olustur
    const formattedProducts = products.map((p, index) => ({
      id: p.id,
      productId: p.id,
      tenantProductId: p.id,
      name: p.name,
      oemCode: p.oemCode,
      oeNumber: p.oemCode,
      brand: p.brand,
      category: p.category,
      subcategory: p.subcategory,
      compatibleModels: p.compatibleModels,
      price: p.price,
      defaultPrice: p.price,
      discountedPrice: p.discountedPrice || p.price,
      customPrice: p.discountedPrice || p.price,
      stock: p.stock,
      imageUrl: p.imageUrl,
      description: p.description,
      specPill: p.specPill,
      shippingText: p.shippingText || (p.stock > 10 ? 'Aynı Gün Kargo' : 'Hızlı Gönderi'),
      bayiId: p.bayiId,
      sellerName: p.bayi?.companyName || p.bayi?.name || 'Yetkili Bayi',
      dealerName: p.bayi?.companyName || p.bayi?.name || 'Yetkili Bayi',
      tenantName: p.bayi?.companyName || p.bayi?.name || 'Yetkili Bayi',
      city: p.bayi?.city || 'İstanbul',
      sellerRating: '4.9',
      sellerSales: 150 + ((index * 17) % 180)
    }));

    // Facet Hesaplama (store.html'deki sol filtre sayaclari icin)
    const allActiveProducts = await prisma.product.findMany({
      where: { isActive: true },
      select: { category: true, brand: true, subcategory: true, price: true }
    });

    const facets = {
      categories: {},
      brands: {},
      subcategories: {},
      priceMin: 0,
      priceMax: 0,
      totalCount: allActiveProducts.length
    };

    allActiveProducts.forEach(p => {
      if (p.category) {
        facets.categories[p.category] = (facets.categories[p.category] || 0) + 1;
      }
      if (p.brand) {
        facets.brands[p.brand] = (facets.brands[p.brand] || 0) + 1;
      }
      if (p.subcategory) {
        facets.subcategories[p.subcategory] = (facets.subcategories[p.subcategory] || 0) + 1;
      }
      if (facets.priceMax === 0 || p.price > facets.priceMax) facets.priceMax = p.price;
      if (facets.priceMin === 0 || p.price < facets.priceMin) facets.priceMin = p.price;
    });

    return successResponse(res, formattedProducts, 'Ürünler listelendi', 200, {
      facets,
      pagination: {
        page: parseInt(page, 10),
        limit: take,
        total: totalCount,
        totalPages: Math.ceil(totalCount / take)
      }
    });
  } catch (err) {
    next(err);
  }
}

/**
 * 2. TEK URUN DETAYI (GET /api/store/products/:id)
 */
async function getProductById(req, res, next) {
  try {
    const { id } = req.params;
    const product = await prisma.product.findUnique({
      where: { id },
      include: {
        bayi: {
          select: { id: true, name: true, companyName: true, city: true, phone: true }
        }
      }
    });

    if (!product || !product.isActive) {
      return errorResponse(res, 'Ürün bulunamadı veya satışa kapalı.', 404);
    }

    return successResponse(res, product, 'Ürün detayları getirildi.');
  } catch (err) {
    next(err);
  }
}

/**
 * 3. KATEGORI VE MARKA LISTESI (GET /api/store/categories)
 */
async function getCategories(req, res, next) {
  try {
    const products = await prisma.product.findMany({
      where: { isActive: true },
      select: { category: true, brand: true }
    });

    const categoryMap = {};
    const brandMap = {};

    products.forEach(p => {
      if (p.category) categoryMap[p.category] = (categoryMap[p.category] || 0) + 1;
      if (p.brand) brandMap[p.brand] = (brandMap[p.brand] || 0) + 1;
    });

    return successResponse(res, {
      categories: Object.keys(categoryMap).map(name => ({ name, count: categoryMap[name] })),
      brands: Object.keys(brandMap).map(name => ({ name, count: brandMap[name] }))
    }, 'Kategori ve marka listesi getirildi.');
  } catch (err) {
    next(err);
  }
}

/**
 * 4. MUSTERI SEPETI (GET /api/store/cart)
 */
async function getCart(req, res, next) {
  try {
    const userId = req.user.id;

    let cart = await prisma.cart.findUnique({
      where: { userId },
      include: {
        items: {
          include: {
            product: {
              select: {
                id: true,
                name: true,
                oemCode: true,
                brand: true,
                price: true,
                discountedPrice: true,
                imageUrl: true,
                stock: true,
                bayi: {
                  select: { name: true, companyName: true }
                }
              }
            }
          }
        }
      }
    });

    if (!cart) {
      cart = await prisma.cart.create({
        data: { userId },
        include: { items: true }
      });
    }

    const items = (cart.items || []).map(i => ({
      id: i.id,
      productId: i.productId,
      name: i.product.name,
      oemCode: i.product.oemCode,
      brand: i.product.brand,
      quantity: i.quantity,
      unitPrice: i.unitPrice,
      totalPrice: +(i.unitPrice * i.quantity).toFixed(2),
      imageUrl: i.product.imageUrl,
      stock: i.product.stock,
      sellerName: i.product.bayi?.companyName || i.product.bayi?.name || 'Yetkili Bayi'
    }));

    const subtotal = items.reduce((acc, curr) => acc + curr.totalPrice, 0);
    const vatAmount = +(subtotal * 0.20).toFixed(2);
    const grandTotal = +(subtotal + vatAmount).toFixed(2);

    return successResponse(res, {
      cartId: cart.id,
      items,
      itemCount: items.reduce((sum, item) => sum + item.quantity, 0),
      subtotal: +subtotal.toFixed(2),
      vatAmount,
      grandTotal
    }, 'Sepet içeriği getirildi.');
  } catch (err) {
    next(err);
  }
}

/**
 * 5. SEPETE URUN EKLEME (POST /api/store/cart)
 */
async function addToCart(req, res, next) {
  try {
    const userId = req.user.id;
    const { productId, quantity = 1 } = req.body;

    if (!productId) {
      return errorResponse(res, 'Ürün ID (productId) zorunludur.', 400);
    }

    const product = await prisma.product.findUnique({
      where: { id: productId }
    });

    if (!product || !product.isActive) {
      return errorResponse(res, 'Ürün bulunamadı veya satışta değil.', 404);
    }

    if (product.stock < quantity) {
      return errorResponse(res, `Yetersiz stok! Mevcut stok: ${product.stock}`, 400);
    }

    let cart = await prisma.cart.findUnique({
      where: { userId }
    });

    if (!cart) {
      cart = await prisma.cart.create({ data: { userId } });
    }

    const effectivePrice = product.discountedPrice || product.price;

    const existingItem = await prisma.cartItem.findUnique({
      where: {
        cartId_productId: {
          cartId: cart.id,
          productId: product.id
        }
      }
    });

    if (existingItem) {
      const newQty = existingItem.quantity + parseInt(quantity, 10);
      if (product.stock < newQty) {
        return errorResponse(res, `Toplam talep edilen adet mevcut stoku (${product.stock}) aşıyor.`, 400);
      }
      await prisma.cartItem.update({
        where: { id: existingItem.id },
        data: {
          quantity: newQty,
          unitPrice: effectivePrice
        }
      });
    } else {
      await prisma.cartItem.create({
        data: {
          cartId: cart.id,
          productId: product.id,
          quantity: parseInt(quantity, 10),
          unitPrice: effectivePrice
        }
      });
    }

    return successResponse(res, null, 'Ürün sepete başarıyla eklendi.');
  } catch (err) {
    next(err);
  }
}

/**
 * 6. SEPETTEN URUN SILME (DELETE /api/store/cart/:itemId)
 */
async function removeCartItem(req, res, next) {
  try {
    const { itemId } = req.params;
    await prisma.cartItem.deleteMany({
      where: { id: itemId }
    });
    return successResponse(res, null, 'Ürün sepetten kaldırıldı.');
  } catch (err) {
    next(err);
  }
}

/**
 * 7. SEPETI SIFIRLAMA (DELETE /api/store/cart)
 */
async function clearCart(req, res, next) {
  try {
    const userId = req.user.id;
    const cart = await prisma.cart.findUnique({ where: { userId } });
    if (cart) {
      await prisma.cartItem.deleteMany({ where: { cartId: cart.id } });
    }
    return successResponse(res, null, 'Sepet başarıyla temizlendi.');
  } catch (err) {
    next(err);
  }
}

/**
 * 8. SIPARIS ONAYLAMA (POST /api/store/orders & POST /api/orders)
 * store.html'in checkout modalindan gelen siparis istegini karsilar.
 */
async function createOrder(req, res, next) {
  try {
    let userId = req.user ? req.user.id : null;

    // Eger req.user henuz tanimli degilse (anonim veya fallback token)
    if (!userId) {
      // Demo / Magaza musterisi bul veya olustur
      let fallbackCustomer = await prisma.user.findFirst({
        where: { role: 'MUSTERI' }
      });
      if (!fallbackCustomer) {
        fallbackCustomer = await prisma.user.create({
          data: {
            email: 'musteri_demo@parcapro.com',
            password: 'DemoPassword123!',
            name: 'B2B Demo Müşteri',
            role: 'MUSTERI',
            city: 'İstanbul'
          }
        });
      }
      userId = fallbackCustomer.id;
    }

    const { items, shippingAddress, notes, customerNotes } = req.body;

    if (!items || !Array.isArray(items) || items.length === 0) {
      return errorResponse(res, 'Sipariş için sepette en az bir ürün bulunmalıdır.', 400);
    }

    // Toplam tutarlari hesapla ve stok kontrolu yap
    let subtotal = 0;
    const orderItemsData = [];

    for (const item of items) {
      const prodId = item.productId || item.id || item.tenantProductId;
      const product = await prisma.product.findUnique({
        where: { id: prodId }
      });

      const qty = parseInt(item.quantity || item.qty || 1, 10);
      const unitPrice = parseFloat(item.unitPrice || item.price || (product ? product.price : 0));
      const lineTotal = parseFloat((qty * unitPrice).toFixed(2));
      subtotal += lineTotal;

      // Stok varsa kontrol et ve dusur
      if (product) {
        if (product.stock >= qty) {
          await prisma.product.update({
            where: { id: product.id },
            data: { stock: { decrement: qty } }
          });
        }
      }

      orderItemsData.push({
        productId: product ? product.id : null,
        name: item.name || (product ? product.name : 'Yedek Parça'),
        oeNumber: item.oeNumber || item.oemCode || (product ? product.oemCode : null),
        quantity: qty,
        unitPrice,
        totalPrice: lineTotal,
        imageUrl: item.imageUrl || (product ? product.imageUrl : null),
        sellerName: item.sellerName || (product ? 'Yetkili Bayi' : 'ParçaPro Bayi'),
        bayiId: product ? product.bayiId : null
      });
    }

    const vatAmount = parseFloat((subtotal * 0.20).toFixed(2));
    const grandTotal = parseFloat((subtotal + vatAmount).toFixed(2));
    const orderNumber = `SP-${Date.now().toString(36).toUpperCase()}-${Math.floor(100 + Math.random() * 900)}`;

    const order = await prisma.order.create({
      data: {
        orderNumber,
        userId,
        status: 'CONFIRMED',
        subtotal: parseFloat(subtotal.toFixed(2)),
        vatAmount,
        grandTotal,
        shippingAddress: shippingAddress || 'Kayıtlı Servis Adresi',
        customerNotes: customerNotes || notes || null,
        paymentStatus: 'COMPLETED',
        items: {
          create: orderItemsData
        }
      },
      include: {
        items: true,
        user: {
          select: { id: true, name: true, email: true, companyName: true }
        }
      }
    });

    // Kullanicinin sepetini temizle
    const userCart = await prisma.cart.findUnique({ where: { userId } });
    if (userCart) {
      await prisma.cartItem.deleteMany({ where: { cartId: userCart.id } });
    }

    // Musteri icin basarili siparis bildirimi olustur
    await prisma.notification.create({
      data: {
        userId,
        title: 'Siparişiniz Alındı',
        message: `${order.orderNumber} numaralı siparişiniz başarıyla onaylandı ve satıcı bayilere iletildi.`,
        type: 'ORDER_STATUS'
      }
    });

    return successResponse(
      res,
      order,
      'Siparişiniz başarıyla onaylandı!',
      201,
      {
        id: order.id,
        orderNumber: order.orderNumber
      }
    );
  } catch (err) {
    next(err);
  }
}

/**
 * 9. MUSTERI SIPARISLERI (GET /api/store/orders)
 */
async function getCustomerOrders(req, res, next) {
  try {
    const userId = req.user.id;

    const orders = await prisma.order.findMany({
      where: { userId },
      include: {
        items: true
      },
      orderBy: { createdAt: 'desc' }
    });

    return successResponse(res, orders, 'Siparişleriniz listelendi.');
  } catch (err) {
    next(err);
  }
}

/**
 * 10. FAVORILER (GET & POST /api/store/favorites & /api/favorites)
 */
async function getFavorites(req, res, next) {
  try {
    const userId = req.user ? req.user.id : null;
    if (!userId) {
      return successResponse(res, [], 'Favoriler listelendi.');
    }

    const favorites = await prisma.favorite.findMany({
      where: { userId },
      include: { product: true }
    });

    const productIds = favorites.map(f => f.productId);
    return successResponse(res, productIds, 'Favoriler listelendi.');
  } catch (err) {
    next(err);
  }
}

async function toggleFavorite(req, res, next) {
  try {
    let userId = req.user ? req.user.id : null;
    const { productId } = req.body;

    if (!productId) {
      return errorResponse(res, 'Ürün ID zorunludur.', 400);
    }

    if (!userId) {
      const demoUser = await prisma.user.findFirst({ where: { role: 'MUSTERI' } });
      userId = demoUser ? demoUser.id : null;
    }

    if (!userId) {
      return successResponse(res, { favorited: true }, 'Favori eklendi.');
    }

    const existing = await prisma.favorite.findUnique({
      where: {
        userId_productId: {
          userId,
          productId
        }
      }
    });

    if (existing) {
      await prisma.favorite.delete({
        where: { id: existing.id }
      });
      return successResponse(res, { favorited: false }, 'Favorilerden kaldırıldı.');
    } else {
      await prisma.favorite.create({
        data: { userId, productId }
      });
      return successResponse(res, { favorited: true }, 'Favorilere eklendi.');
    }
  } catch (err) {
    next(err);
  }
}

/**
 * 11. BILDIRIMLER (GET & POST /api/store/notifications)
 */
async function getNotifications(req, res, next) {
  try {
    const userId = req.user ? req.user.id : null;

    const notifications = await prisma.notification.findMany({
      where: userId ? { OR: [{ userId }, { userId: null }] } : { userId: null },
      orderBy: { createdAt: 'desc' },
      take: 20
    });

    return successResponse(res, notifications, 'Bildirimler getirildi.');
  } catch (err) {
    next(err);
  }
}

async function markNotificationsRead(req, res, next) {
  try {
    const { id, all } = req.body;
    const userId = req.user ? req.user.id : null;

    if (all) {
      await prisma.notification.updateMany({
        where: userId ? { userId } : {},
        data: { isRead: true }
      });
    } else if (id) {
      await prisma.notification.update({
        where: { id },
        data: { isRead: true }
      });
    }

    return successResponse(res, null, 'Bildirim okundu olarak işaretlendi.');
  } catch (err) {
    next(err);
  }
}

module.exports = {
  getProducts,
  getProductById,
  getCategories,
  getCart,
  addToCart,
  removeCartItem,
  clearCart,
  createOrder,
  getCustomerOrders,
  getFavorites,
  toggleFavorite,
  getNotifications,
  markNotificationsRead
};

