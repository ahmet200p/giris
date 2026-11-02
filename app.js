const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const path = require('path');

const env = require('./src/config/env');
const errorHandler = require('./src/middleware/errorHandler');

// Rota Modulleri
const authRoutes = require('./src/routes/auth.routes');
const storeRoutes = require('./src/routes/store.routes');
const bayiRoutes = require('./src/routes/bayi.routes');
const adminRoutes = require('./src/routes/admin.routes');

const app = express();

/**
 * ADIM 4: CORS VE HEADLESS BAGLANTISI
 * Farkli klasorlerden, localhost portlarindan (Live Server, Vite, Next.js vb.)
 * ve ayrica dogrudan dosya sistemi (file://) fetch isteklerinden gelen baglantilari
 * engellemeyecek sekilde esnek ve guclu CORS yapilandirmasi.
 */
const corsOptions = {
  origin: (origin, callback) => {
    // origin yoksa (mobil uygulama, curl, Postman, file://, SSR vb.) veya * ise izin ver
    if (!origin || env.CORS_ORIGIN === '*' || origin === 'null') {
      return callback(null, true);
    }
    const allowed = env.CORS_ORIGIN.split(',').map(s => s.trim());
    if (allowed.includes(origin) || allowed.includes('*')) {
      return callback(null, true);
    }
    // Tum yerel gelistirme ve headless originlerine izin ver
    if (/^http:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(origin)) {
      return callback(null, true);
    }
    return callback(null, true); // Headless mimaride tum istemcilere tam erisim
  },
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: [
    'Origin',
    'X-Requested-With',
    'Content-Type',
    'Accept',
    'Authorization',
    'X-Tenant-Id',
    'x-tenant-id'
  ],
  exposedHeaders: ['Authorization', 'Content-Disposition'],
  credentials: true,
  preflightContinue: false,
  optionsSuccessStatus: 204
};

app.use(cors(corsOptions));
// Tum OPTIONS preflight isteklerine aninda yanit don
app.options('*', cors(corsOptions));

// Guvenlik basliklari (Headless ve statik varliklar icin esnetilmis)
app.use(
  helmet({
    crossOriginResourcePolicy: { policy: 'cross-origin' },
    contentSecurityPolicy: false // CDN scriptlerinin (SweetAlert2, Lucide, IMask vb.) rahat calismasi icin
  })
);

// HTTP Istek Loglayici
if (env.NODE_ENV !== 'test') {
  app.use(morgan('dev'));
}

// JSON ve URL-Encoded Govde Ayristiricilar
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Statik Dosya Sunumu (store.html ve store.css'in dogrudan test edilebilmesi icin)
app.use(express.static(path.join(__dirname, '.')));

/**
 * SAGLIK KONTROLU (HEALTH CHECK)
 */
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    architecture: 'Headless Multi-Frontend Dual-Auth RBAC',
    roles: ['ADMIN', 'BAYI', 'MUSTERI'],
    endpoints: {
      panelLogin: '/api/auth/panel-login',
      storeLogin: '/api/auth/store-login',
      storeApi: '/api/store/...',
      bayiApi: '/api/bayi/...',
      adminApi: '/api/admin/...'
    }
  });
});

/**
 * ADIM 2 & 3: ROTA IZOLASYONU VE REGISTER
 */
// 1. Auth Modulu (Cift Kapili Giris: Panel & Store)
app.use('/api/auth', authRoutes);

// 2. Musteri (Store) Modulu -> Sadece Musteri & Magaza (/store.html)
app.use('/api/store', storeRoutes);

// store.html icerisindeki dogrudan /api/products, /api/orders, /api/favorites fallback uyumlulugu
app.use('/api', storeRoutes);

// 3. Bayi Modulu -> Sadece Bayi Urun & Stok Yonetimi
app.use('/api/bayi', bayiRoutes);

// 4. Admin Modulu -> Tum Sisteme Mudahale Eden Yetkili Yonetim
app.use('/api/admin', adminRoutes);

// 404 Bulunamadi Yoneticisi
app.use('/api/*', (req, res) => {
  res.status(404).json({
    success: false,
    message: `Istenen endpoint bulunamadi: ${req.method} ${req.originalUrl}`
  });
});

// Merkezi Hata Yakalayici
app.use(errorHandler);

module.exports = app;

