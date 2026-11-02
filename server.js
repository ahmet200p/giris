const app = require('./app');
const env = require('./src/config/env');
const prisma = require('./src/config/prisma');

const PORT = env.PORT || 5000;

const server = app.listen(PORT, () => {
  console.log('================================================================');
  console.log(`🚀 Headless RBAC Backend API Baslatildi!`);
  console.log(`📡 Port: http://localhost:${PORT}`);
  console.log(`🏪 Storefront: http://localhost:${PORT}/store.html`);
  console.log(`🩺 Health Check: http://localhost:${PORT}/api/health`);
  console.log(`🔐 Cift Kapili Auth:`);
  console.log(`   - Panel Girisi (Admin/Bayi): POST http://localhost:${PORT}/api/auth/panel-login`);
  console.log(`   - Store Girisi (Musteri):    POST http://localhost:${PORT}/api/auth/store-login`);
  console.log(`🔀 Izole Rotalar:`);
  console.log(`   - /api/store/... (Musteri Urunler, Sepet, Siparis)`);
  console.log(`   - /api/bayi/...  (Bayi Kendi Urunleri & Stok Yonetimi)`);
  console.log(`   - /api/admin/... (Sistem Genel Yonetimi)`);
  console.log('================================================================');
});

// Zarif Kapanma (Graceful Shutdown)
async function gracefulShutdown(signal) {
  console.log(`\n🛑 ${signal} sinyali alindi, sunucu guvenli sekilde kapatiliyor...`);
  server.close(async () => {
    try {
      await prisma.$disconnect();
      console.log('🔒 Prisma veritabani baglantisi kapatildi.');
      process.exit(0);
    } catch (err) {
      console.error('Kapatma hatasi:', err);
      process.exit(1);
    }
  });
}

process.on('SIGINT', () => gracefulShutdown('SIGINT'));
process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));

module.exports = server;

