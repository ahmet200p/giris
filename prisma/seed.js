// Prisma Seed Script - Initial Users and Products for Headless RBAC System
const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Veritabani baslangic verileri (Seed) yukleniyor...');

  // 1. Temizleme
  await prisma.notification.deleteMany();
  await prisma.favorite.deleteMany();
  await prisma.orderItem.deleteMany();
  await prisma.order.deleteMany();
  await prisma.cartItem.deleteMany();
  await prisma.cart.deleteMany();
  await prisma.product.deleteMany();
  await prisma.user.deleteMany();

  const hashedAdminPassword = await bcrypt.hash('AdminPassword123!', 10);
  const hashedBayiPassword = await bcrypt.hash('BayiPassword123!', 10);
  const hashedMusteriPassword = await bcrypt.hash('MusteriPassword123!', 10);

  // 2. ADMIN Kullanicisi
  const adminUser = await prisma.user.create({
    data: {
      email: 'admin@parcapro.com',
      password: hashedAdminPassword,
      name: 'Super Admin',
      companyName: 'ParcaPro B2B Platform HQ',
      role: 'ADMIN',
      city: 'Istanbul',
      phone: '+90 212 555 0001'
    }
  });

  // 3. BAYI Kullanicilari (Urun ekleyebilen roller)
  const bayi1 = await prisma.user.create({
    data: {
      email: 'bayi1@parcapro.com',
      password: hashedBayiPassword,
      name: 'Ahmet Usta (Yetkili Bayi)',
      companyName: 'Ahmet Otomotiv San. Tic. Ltd. Sti.',
      taxNumber: '1234567890',
      taxOffice: 'Ikitelli VD',
      city: 'Istanbul (Ikitelli OSB)',
      phone: '+90 212 444 1001',
      role: 'BAYI'
    }
  });

  const bayi2 = await prisma.user.create({
    data: {
      email: 'bayi2@parcapro.com',
      password: hashedBayiPassword,
      name: 'Ostim Fren & Debriyaj',
      companyName: 'Ostim Otomotiv Dagitim A.S.',
      taxNumber: '9876543210',
      taxOffice: 'Ostim VD',
      city: 'Ankara (Ostim Sanayi)',
      phone: '+90 312 333 2002',
      role: 'BAYI'
    }
  });

  // 4. MUSTERI (B2B Alici) Kullanicisi (Siparis ve Sepet sahibi roller)
  const musteri1 = await prisma.user.create({
    data: {
      email: 'musteri@parcapro.com',
      password: hashedMusteriPassword,
      name: 'Hakan Usta Ozel Servis',
      companyName: 'Hakan Garaj Servis Ltd.',
      taxNumber: '5556667778',
      taxOffice: 'Nilufer VD',
      city: 'Bursa',
      address: 'Kucuk Sanayi Sitesi 12. Blok No:45',
      phone: '+90 532 111 2233',
      role: 'MUSTERI'
    }
  });

  // 5. Bayi 1 ve Bayi 2 Urunleri (store.html ile %100 uyumlu oemCode, brand, category vb.)
  const productsData = [
    {
      name: 'Brembo Ön Fren Diski (Hava Kanallı)',
      oemCode: '1K0 615 301 AA',
      brand: 'BREMBO',
      category: 'Fren Sistemi',
      subcategory: 'Fren Diski',
      compatibleModels: 'VW Golf VII / Passat B8 / Audi A3 8V',
      price: 3450.0,
      discountedPrice: 3100.0,
      stock: 24,
      imageUrl: 'https://images.unsplash.com/photo-1600790142055-619df03207e6?w=600&auto=format&fit=crop&q=60',
      description: 'Yüksek karbonlu alaşım, havalandırmalı soğutma kanallı orijinal Brembo ön disk.',
      specPill: 'Çap: 288 mm (Havalandırmalı)',
      shippingText: 'Aynı Gün Kargo',
      bayiId: bayi1.id
    },
    {
      name: 'Bosch Ön Fren Balata Takımı',
      oemCode: '5Q0 698 151 B',
      brand: 'BOSCH',
      category: 'Fren Sistemi',
      subcategory: 'Fren Balatası',
      compatibleModels: 'VW Golf VII / Seat Leon 5F / Skoda Octavia',
      price: 1850.0,
      discountedPrice: 1650.0,
      stock: 35,
      imageUrl: 'https://images.unsplash.com/photo-1486262715619-67b85e0b08d3?w=600&auto=format&fit=crop&q=60',
      description: 'Ses yapmayan seramik katkılı Bosch fren balata takımı, aşınma sensörlü.',
      specPill: 'Akustik Aşınma Uyarılı',
      shippingText: 'Aynı Gün Kargo',
      bayiId: bayi1.id
    },
    {
      name: 'Mann Filtre 4\'lü Periyodik Bakım Seti',
      oemCode: 'SET-MANN-G7-TDI',
      brand: 'MANN FILTER',
      category: 'Filtre Grubu',
      subcategory: 'Bakım Seti',
      compatibleModels: 'VW Golf VII 1.6 TDI / Passat B8 1.6 TDI',
      price: 2400.0,
      discountedPrice: 2150.0,
      stock: 18,
      imageUrl: 'https://images.unsplash.com/photo-1549399542-7e3f8b79c341?w=600&auto=format&fit=crop&q=60',
      description: 'Yağ, hava, polen (karbonlu) ve mazot filtresi orijinal Mann Filtre seti.',
      specPill: 'KOMBO BAKIM SETİ',
      shippingText: 'Ücretsiz Kargo',
      bayiId: bayi2.id
    },
    {
      name: 'Sachs Debriyaj Seti ve Oynar Volan Takımı',
      oemCode: '2290 601 050',
      brand: 'SACHS',
      category: 'Debriyaj & Şanzıman',
      subcategory: 'Debriyaj Seti',
      compatibleModels: 'VW Golf VII 1.6 / 2.0 TDI Manuel',
      price: 18500.0,
      discountedPrice: 16900.0,
      stock: 6,
      imageUrl: 'https://images.unsplash.com/photo-1517524008697-84bbe3c3fd98?w=600&auto=format&fit=crop&q=60',
      description: 'Orijinal Sachs DMF (çift kütleli volan) baskı, balata ve rulman kiti.',
      specPill: 'Volan Dahil Tam Kit',
      shippingText: 'Aynı Gün Kargo',
      bayiId: bayi2.id
    },
    {
      name: 'Lemförder Salıncak ve Rotil Kiti (Sağ/Sol)',
      oemCode: '5Q0 407 151 J',
      brand: 'LEMFÖRDER',
      category: 'Süspansiyon & Direksiyon',
      subcategory: 'Salıncak',
      compatibleModels: 'VW Golf VII / Audi A3 8V / Seat Leon',
      price: 4200.0,
      discountedPrice: 3850.0,
      stock: 12,
      imageUrl: 'https://images.unsplash.com/photo-1580273916550-e323be2ae537?w=600&auto=format&fit=crop&q=60',
      description: 'Alman OEM standartlarında Lemförder döküm salıncak ve burç grubu.',
      specPill: 'Takviyeli Burçlu',
      shippingText: 'Aynı Gün Kargo',
      bayiId: bayi1.id
    },
    {
      name: 'NGK Lazer İridyum Buji Seti (4 Adet)',
      oemCode: '04E 905 601 B',
      brand: 'NGK',
      category: 'Motor & Ateşleme',
      subcategory: 'Buji',
      compatibleModels: 'VW Golf VII 1.2 / 1.4 TSI',
      price: 1600.0,
      discountedPrice: 1450.0,
      stock: 40,
      imageUrl: 'https://images.unsplash.com/photo-1558441719-74e98f79d505?w=600&auto=format&fit=crop&q=60',
      description: 'Yüksek performanslı NGK Laser Iridium buji kiti.',
      specPill: '4 Adet Takım',
      shippingText: 'Aynı Gün Kargo',
      bayiId: bayi2.id
    }
  ];

  for (const item of productsData) {
    await prisma.product.create({ data: item });
  }

  // 6. Musteri icin bir ornek sepet olustur
  const createdProducts = await prisma.product.findMany();
  const cart = await prisma.cart.create({
    data: {
      userId: musteri1.id,
      items: {
        create: [
          {
            productId: createdProducts[0].id,
            quantity: 2,
            unitPrice: createdProducts[0].discountedPrice || createdProducts[0].price
          }
        ]
      }
    }
  });

  // 7. Musteri icin ornek bir tamamlanmis siparis olustur
  const orderSubtotal = createdProducts[1].discountedPrice * 2;
  const orderVat = +(orderSubtotal * 0.20).toFixed(2);
  const orderGrand = +(orderSubtotal + orderVat).toFixed(2);

  await prisma.order.create({
    data: {
      orderNumber: `SP-20261102-${Math.floor(1000 + Math.random() * 9000)}`,
      userId: musteri1.id,
      status: 'CONFIRMED',
      subtotal: orderSubtotal,
      vatAmount: orderVat,
      grandTotal: orderGrand,
      shippingAddress: musteri1.address,
      customerNotes: 'Acil kargo rica ederiz, servis araci bekliyor.',
      items: {
        create: [
          {
            productId: createdProducts[1].id,
            name: createdProducts[1].name,
            oeNumber: createdProducts[1].oemCode,
            quantity: 2,
            unitPrice: createdProducts[1].discountedPrice,
            totalPrice: orderSubtotal,
            imageUrl: createdProducts[1].imageUrl,
            sellerName: bayi1.name,
            bayiId: bayi1.id
          }
        ]
      }
    }
  });

  // 8. Sistem bildirimleri
  await prisma.notification.createMany({
    data: [
      {
        userId: musteri1.id,
        title: 'Siparişiniz Onaylandı',
        message: 'SP-20261102 nolu siparişiniz bayi tarafından hazırlanıyor.',
        type: 'ORDER_STATUS',
        isRead: false
      },
      {
        userId: musteri1.id,
        title: 'Fiyat İndirimi Fırsatı',
        message: 'Brembo fren disklerinde B2B özel kampanya başladı!',
        type: 'PRICE_DROP',
        productId: createdProducts[0].id,
        isRead: false
      }
    ]
  });

  console.log('✅ Seed islemi basariyla tamamlandi!');
  console.log('--- TEST HESAPLARI ---');
  console.log('ADMIN:   admin@parcapro.com / AdminPassword123!');
  console.log('BAYI 1:  bayi1@parcapro.com / BayiPassword123!');
  console.log('BAYI 2:  bayi2@parcapro.com / BayiPassword123!');
  console.log('MUSTERI: musteri@parcapro.com / MusteriPassword123!');
}

main()
  .catch((e) => {
    console.error('Seed hatasi:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

