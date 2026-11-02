// Comprehensive In-Process E2E Verification Test for Headless Dual-Auth RBAC System
const http = require('http');
const { Readable, Writable } = require('stream');
const app = require('../app');
const prisma = require('../src/config/prisma');

/**
 * In-Process HTTP Dispatcher
 * Standart Sandbox guvenlik ortaminda soket baglanti kisitlamasina takilmadan
 * Express router, auth middleware, Zod ve Prisma sorgularini uctan uca test eder.
 */
function request(options, body = null) {
  return new Promise((resolve, reject) => {
    const bodyStr = body ? (typeof body === 'string' ? body : JSON.stringify(body)) : '';
    const bodyBuf = Buffer.from(bodyStr);

    const socket = new Readable({ read() {} });
    socket.remoteAddress = '127.0.0.1';
    socket.encrypted = false;

    const req = new http.IncomingMessage(socket);
    req.method = (options.method || 'GET').toUpperCase();
    req.url = options.path || '/';
    req.headers = {
      host: 'localhost:5000',
      ...(options.headers
        ? Object.fromEntries(
            Object.entries(options.headers).map(([k, v]) => [k.toLowerCase(), v])
          )
        : {})
    };

    if (body) {
      req.headers['content-type'] = req.headers['content-type'] || 'application/json';
      req.headers['content-length'] = String(bodyBuf.length);
    }

    const resSocket = new Writable({
      write(chunk, encoding, callback) {
        callback();
      }
    });

    const res = new http.ServerResponse(req);
    res.assignSocket(resSocket);

    let resBody = '';
    const origWrite = res.write.bind(res);
    const origEnd = res.end.bind(res);

    res.write = function (chunk, ...args) {
      if (chunk) resBody += chunk.toString();
      return origWrite(chunk, ...args);
    };

    res.end = function (chunk, ...args) {
      if (chunk) resBody += chunk.toString();
      origEnd(chunk, ...args);

      let parsed;
      try {
        parsed = JSON.parse(resBody);
      } catch (e) {
        parsed = resBody;
      }

      resolve({
        status: res.statusCode,
        headers: res.getHeaders(),
        body: parsed
      });
    };

    app(req, res);

    if (bodyBuf.length > 0) {
      req.push(bodyBuf);
    }
    req.push(null);
  });
}

function assert(condition, message) {
  if (!condition) {
    console.error(`❌ TEST BASARISIZ: ${message}`);
    process.exit(1);
  } else {
    console.log(`  ✔ BASARILI: ${message}`);
  }
}

async function runTests() {
  console.log('🧪 ========================================================');
  console.log('🧪 HEADLESS DUAL-AUTH RBAC API OTOMATIK TEST TEST SURECI');
  console.log('🧪 ========================================================\n');

  try {
    // 1. HEALTH CHECK KONTROLU
    console.log('[TEST 1] Sistem Saglik Kontrolu (GET /api/health)...');
    const health = await request({ path: '/api/health' });
    assert(health.status === 200, 'Health check 200 OK donmeli');
    assert(health.body.status === 'ok', 'Status degeri ok olmali');
    assert(health.body.roles.includes('ADMIN'), 'Rol listesinde ADMIN olmali');
    assert(health.body.roles.includes('BAYI'), 'Rol listesinde BAYI olmali');
    assert(health.body.roles.includes('MUSTERI'), 'Rol listesinde MUSTERI olmali');

    // 2. PANEL LOGIN KONTROLLERI (Admin & Bayi Girisi)
    console.log('\n[TEST 2] Panel Login & Cift Kapi Dogrulamasi (POST /api/auth/panel-login)...');

    // 2.1 Admin Girisi
    const adminLogin = await request(
      { path: '/api/auth/panel-login', method: 'POST' },
      { email: 'admin@parcapro.com', password: 'AdminPassword123!' }
    );
    assert(adminLogin.status === 200, 'Admin panel girisi 200 OK olmali');
    assert(adminLogin.body.data.user.role === 'ADMIN', 'Donen kullanici rolu ADMIN olmali');
    assert(!!adminLogin.body.data.token, 'Admin icin JWT token uretilmeli');
    const adminToken = adminLogin.body.data.token;

    // 2.2 Bayi Girisi
    const bayiLogin = await request(
      { path: '/api/auth/panel-login', method: 'POST' },
      { email: 'bayi1@parcapro.com', password: 'BayiPassword123!' }
    );
    assert(bayiLogin.status === 200, 'Bayi panel girisi 200 OK olmali');
    assert(bayiLogin.body.data.user.role === 'BAYI', 'Donen kullanici rolu BAYI olmali');
    const bayiToken = bayiLogin.body.data.token;

    // 2.3 Musteri Panel Girisi Denemesi (BLOKLANMALI!)
    const musteriPanelFail = await request(
      { path: '/api/auth/panel-login', method: 'POST' },
      { email: 'musteri@parcapro.com', password: 'MusteriPassword123!' }
    );
    assert(musteriPanelFail.status === 403, 'Musterinin panele giris denemesi 403 Forbidden ile engellenmeli');
    assert(musteriPanelFail.body.success === false, 'Hata cevabinda success: false olmali');

    // 3. STORE LOGIN KONTROLLERI (Musteri Girisi)
    console.log('\n[TEST 3] Store Login & Musteri Giris Dogrulamasi (POST /api/auth/store-login)...');

    // 3.1 Musteri Girisi
    const musteriLogin = await request(
      { path: '/api/auth/store-login', method: 'POST' },
      { email: 'musteri@parcapro.com', password: 'MusteriPassword123!' }
    );
    assert(musteriLogin.status === 200, 'Musteri magaza girisi 200 OK olmali');
    assert(musteriLogin.body.data.user.role === 'MUSTERI', 'Donen rol MUSTERI olmali');
    const musteriToken = musteriLogin.body.data.token;

    // 3.2 Admin veya Bayi Magaza Giris Denemesi (BLOKLANMALI!)
    const adminStoreFail = await request(
      { path: '/api/auth/store-login', method: 'POST' },
      { email: 'admin@parcapro.com', password: 'AdminPassword123!' }
    );
    assert(adminStoreFail.status === 403, 'Admin veya Bayinin magaza giris denemesi 403 ile engellenmeli');

    // 4. MUSTERI ISLEMLERI & STORE.HTML UYUMLULUGU (/api/store/...)
    console.log('\n[TEST 4] Store Urun Listeleme, Filtreler & Sepet (/api/store/...)...');

    // 4.1 Urun Listesi ve Facetler
    const storeProducts = await request({ path: '/api/store/products?category=Fren+Sistemi' });
    assert(storeProducts.status === 200, 'Urun listesi 200 OK olmali');
    assert(Array.isArray(storeProducts.body.data), 'data alani dizi olmali');
    assert(storeProducts.body.data.length > 0, 'En az 1 urun listelenmeli');
    assert(!!storeProducts.body.facets, 'Facets nesnesi hesaplanmis olmali');
    assert(storeProducts.body.data[0].oemCode !== undefined, 'Urun nesnesinde oemCode olmali');

    const sampleProduct = storeProducts.body.data[0];

    // 4.2 Sepete Ekleme
    const addToCart = await request(
      {
        path: '/api/store/cart',
        method: 'POST',
        headers: { Authorization: `Bearer ${musteriToken}` }
      },
      { productId: sampleProduct.id, quantity: 1 }
    );
    assert(addToCart.status === 200, 'Sepete ekleme 200 OK olmali');

    // 4.3 Sepeti Goruntuleme
    const viewCart = await request({
      path: '/api/store/cart',
      headers: { Authorization: `Bearer ${musteriToken}` }
    });
    assert(viewCart.status === 200, 'Sepet goruntuleme 200 OK olmali');
    assert(viewCart.body.data.items.length > 0, 'Sepette urun bulunmali');

    // 4.4 Siparis Onaylama (store.html Payload formati)
    console.log('\n[TEST 5] Siparis Onaylama & KDV Hesabi (/api/store/orders)...');
    const orderPayload = {
      items: [
        {
          productId: sampleProduct.id,
          name: sampleProduct.name,
          oeNumber: sampleProduct.oemCode,
          quantity: 2,
          unitPrice: sampleProduct.price,
          totalPrice: sampleProduct.price * 2,
          imageUrl: sampleProduct.imageUrl,
          sellerName: sampleProduct.sellerName
        }
      ],
      shippingAddress: 'Bursa Kucuk Sanayi Sitesi No:12'
    };

    const createOrder = await request(
      {
        path: '/api/store/orders',
        method: 'POST',
        headers: { Authorization: `Bearer ${musteriToken}` }
      },
      orderPayload
    );
    assert(createOrder.status === 201, 'Siparis olusturma 201 Created olmali');
    assert(!!createOrder.body.data.orderNumber, 'Siparis numarasi olusturulmali');
    assert(createOrder.body.data.vatAmount > 0, '%20 KDV tutari hesaplanmali');

    // 5. BAYI ISLEMLERI (/api/bayi/...)
    console.log('\n[TEST 6] Bayi Urun & Stok Yonetimi (/api/bayi/...)...');

    // 5.1 Bayi Kendi Urunlerini Goruntuler
    const bayiProds = await request({
      path: '/api/bayi/products',
      headers: { Authorization: `Bearer ${bayiToken}` }
    });
    assert(bayiProds.status === 200, 'Bayi kendi urunlerini gorebilmeli (200 OK)');

    // 5.2 Bayi Yeni Urun Ekler
    const newProductPayload = {
      name: 'TRW Arka Fren Balatası',
      oemCode: '5Q0 698 451 D',
      brand: 'TRW',
      category: 'Fren Sistemi',
      price: 1250,
      discountedPrice: 1100,
      stock: 50,
      shippingText: 'Aynı Gün Kargo'
    };
    const addBayiProduct = await request(
      {
        path: '/api/bayi/products',
        method: 'POST',
        headers: { Authorization: `Bearer ${bayiToken}` }
      },
      newProductPayload
    );
    assert(addBayiProduct.status === 201, 'Bayi urun ekleyebilmeli (201 Created)');
    const createdBayiProdId = addBayiProduct.body.data.id;

    // 5.3 Bayi Hizli Stok Gunceller
    const updateStock = await request(
      {
        path: `/api/bayi/products/${createdBayiProdId}/stock`,
        method: 'PATCH',
        headers: { Authorization: `Bearer ${bayiToken}` }
      },
      { stock: 75 }
    );
    assert(updateStock.status === 200, 'Bayi stok guncelleyebilmeli (200 OK)');
    assert(updateStock.body.data.stock === 75, 'Yeni stok 75 olmali');

    // 5.4 Musteri Bayi Endpointlerine Erismeye Calisir (BLOKLANMALI!)
    const musteriBayiFail = await request({
      path: '/api/bayi/products',
      headers: { Authorization: `Bearer ${musteriToken}` }
    });
    assert(musteriBayiFail.status === 403, 'Musteri bayi endpointlerine erisememeli (403 Forbidden)');

    // 6. ADMIN ISLEMLERI (/api/admin/...)
    console.log('\n[TEST 7] Admin Sistem Yonetimi & Yetkilendirme (/api/admin/...)...');

    // 6.1 Admin Dashboard Istatistikleri
    const adminStats = await request({
      path: '/api/admin/stats',
      headers: { Authorization: `Bearer ${adminToken}` }
    });
    assert(adminStats.status === 200, 'Admin istatistikleri gorebilmeli (200 OK)');
    assert(adminStats.body.data.users.total >= 4, 'Kullanici sayisi dogrulanmali');

    // 6.2 Admin Kullanicilari Listeler
    const adminUsers = await request({
      path: '/api/admin/users',
      headers: { Authorization: `Bearer ${adminToken}` }
    });
    assert(adminUsers.status === 200, 'Admin kullanicilari listeleyebilmeli (200 OK)');

    // 6.3 Bayi veya Musteri Admin Endpointine Erismeye Calisir (BLOKLANMALI!)
    const bayiAdminFail = await request({
      path: '/api/admin/stats',
      headers: { Authorization: `Bearer ${bayiToken}` }
    });
    assert(bayiAdminFail.status === 403, 'Bayi admin endpointine erisememeli (403 Forbidden)');

    // 7. CORS VE PREFLIGHT KONTROLU
    console.log('\n[TEST 8] CORS ve Headless Preflight Kontrolu (OPTIONS)...');
    const corsPreflight = await request({
      path: '/api/store/products',
      method: 'OPTIONS',
      headers: {
        'Origin': 'http://127.0.0.1:5500',
        'Access-Control-Request-Method': 'GET'
      }
    });
    assert(corsPreflight.status === 204 || corsPreflight.status === 200, 'CORS preflight basarili olmali (200/204)');
    assert(!!corsPreflight.headers['access-control-allow-origin'], 'Access-Control-Allow-Origin basligi donmeli');

    console.log('\n🎉 ========================================================');
    console.log('🎉 TUM TESTLER BASARIYLA TAMAMLANDI (8/8 GECTI)!');
    console.log('🎉 ========================================================');
  } catch (err) {
    console.error('Test sirasinda beklenmeyen hata:', err);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

runTests();
