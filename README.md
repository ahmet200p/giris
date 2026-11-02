# 🚀 Tek Çatı, Çift Kapı: Headless & Rol Bazlı (RBAC) Backend API

Bu proje, **Admin**, **Bayi** ve **Müşteri (B2B Alıcı)** aktörlerini birbirinden izole eden, güvenli, modern ve yüksek performanslı bir **"Tek Çatı, Çift Kapı"** Node.js + Prisma API mimarisidir.

---

## 🏛 Mimari Özeti

- **Tek Çatı:** Tek bir merkezi Express + Prisma backend servisi (`server.js`).
- **Çift Kapı:**
  - **Kapı 1 (Panel Girişi):** Admin ve Bayilerin giriş yaptığı `panel.html` ve `POST /api/auth/panel-login`.
  - **Kapı 2 (Mağaza Girişi):** B2B müşterilerin `store.html` üzerinden giriş yaptığı `POST /api/auth/store-login`.
- **RBAC Yetkilendirme:** `ADMIN`, `BAYI`, `MUSTERI` rolleri Prisma Enum ve JWT Token payload'ı ile korunur.
- **Rota İzolasyonu:**
  - `/api/store/...` -> Müşteri & Vitrin endpointleri (Arama, filtreleme, sepet, sipariş).
  - `/api/bayi/...` -> Bayi endpointleri (Kendi ürünleri, stok yönetimi, siparişleri).
  - `/api/admin/...` -> Yönetici endpointleri (Tüm platform denetimi, kullanıcı rolleri).
- **Headless & Genişletilmiş CORS:** Farklı frontend uygulamalarından (React, Vue, Vite, Live Server, mobil veya doğrudan `store.html`) bağımsız `fetch` isteklerini engellemeden karşılar.

---

## 📦 Kullanılan Güncel Topluluk Paketleri

- **`express` (^4.21.2)**: Hızlı ve minimalist web API çatısı.
- **`@prisma/client` & `prisma` (^6.19.3)**: Tip güvenli modern ORM ve şema yöneticisi.
- **`jsonwebtoken` (^9.0.2)**: Rol tabanlı JWT oturum ve yetki yönetimi.
- **`bcryptjs` (^2.4.3)**: Güvenli tek yönlü şifre karma (hashing).
- **`zod` (^3.24.1)**: Modern şema ve istek doğrulama (validation).
- **`cors` (^2.8.5)**: Esnek Cross-Origin Resource Sharing yapılandırması.
- **`helmet` (^8.0.0)**: Modern HTTP güvenlik başlıkları.
- **`morgan` (^1.10.0)**: Geliştirici dostu HTTP istek loglayıcı.
- **`dotenv` (^16.4.7)**: Ortam değişkenleri yöneticisi.

---

## 📂 Klasör Yapısı

```
giris/
├── prisma/
│   ├── schema.prisma           # Role Enum (ADMIN, BAYI, MUSTERI), Ürün, Sepet, Sipariş modelleri
│   ├── seed.js                 # Test hesapları ve başlangıç ürünleri
│   └── dev.db                  # SQLite yerel veritabanı
├── src/
│   ├── config/
│   │   ├── env.js              # Ortam değişkenleri
│   │   └── prisma.js           # Prisma Client singleton
│   ├── controllers/
│   │   ├── auth.controller.js  # Çift girişli kimlik doğrulama kontrolleri
│   │   ├── store.controller.js # Müşteri ve vitrin işlemleri
│   │   ├── bayi.controller.js  # Bayi ürün ve stok yönetimi
│   │   └── admin.controller.js # Sistem geneli denetim
│   ├── middleware/
│   │   ├── auth.js             # verifyToken, verifyAdmin, verifyBayi, verifyMusteri
│   │   ├── validate.js         # Zod şema doğrulayıcı
│   │   └── errorHandler.js     # Merkezi hata yakalayıcı
│   ├── routes/
│   │   ├── auth.routes.js      # /api/auth/... rotaları
│   │   ├── store.routes.js     # /api/store/... rotaları
│   │   ├── bayi.routes.js      # /api/bayi/... rotaları
│   │   └── admin.routes.js     # /api/admin/... rotaları
│   └── utils/
│       ├── jwt.js              # Token üretici ve rol gömücü
│       └── response.js         # Standart JSON yanıt formatlayıcı
├── tests/
│   └── api_test.js             # Uçtan uca otomatik API ve güvenlik testi
├── assets/
│   └── js/
│       └── api.js              # store.html için merkezi API köprüsü
├── app.js                      # Express yapılandırması, CORS & güvenlik
├── server.js                   # Sunucu dinleyicisi ve graceful shutdown
├── store.html                  # Müşteri B2B vitrini
├── store.css                   # Vitrin stilleri
├── .env                        # Yapılandırma değişkenleri
└── package.json
```

---

## 🚀 Kurulum ve Çalıştırma

### 1. Bağımlılıkları Yükleme
```bash
npm install
```

### 2. Veritabanını Senkronize Etme (Prisma Push)
```bash
npm run prisma:push
```

### 3. Başlangıç Verilerini Yükleme (Seed)
```bash
npm run prisma:seed
```

### 4. Sunucuyu Başlatma
```bash
# Canlı geliştirme modu (nodemon):
npm run dev

# Standart başlatma:
npm start
```
Sunucu varsayılan olarak **`http://localhost:5000`** adresinde ayağa kalkar.

### 5. Otomatik Testleri Çalıştırma
```bash
npm test
```

---

## 🔑 Hazır Test Hesapları

| Rol | E-Posta | Şifre | Giriş Kapısı / Yetki |
|---|---|---|---|
| **ADMIN** | `admin@parcapro.com` | `AdminPassword123!` | `/api/auth/panel-login` (Tüm Sistem) |
| **BAYİ 1** | `bayi1@parcapro.com` | `BayiPassword123!` | `/api/auth/panel-login` (Kendi Ürün/Stokları) |
| **BAYİ 2** | `bayi2@parcapro.com` | `BayiPassword123!` | `/api/auth/panel-login` (Kendi Ürün/Stokları) |
| **MÜŞTERİ** | `musteri@parcapro.com` | `MusteriPassword123!` | `/api/auth/store-login` (`store.html` Vitrini) |

---

## 📡 API Endpoint Referansı

### 1. Kimlik Doğrulama (`/api/auth`)
| Metod | Endpoint | Açıklama | Yetki |
|---|---|---|---|
| `POST` | `/api/auth/panel-login` | Admin ve Bayi giriş kapısı (Müşterileri engeller) | Açık |
| `POST` | `/api/auth/store-login` | Müşteri giriş kapısı (Admin/Bayileri engeller) | Açık |
| `POST` | `/api/auth/store-register`| Müşteri (B2B alıcı) kaydı | Açık |
| `POST` | `/api/auth/bayi-register` | Bayi başvuru / kayıt | Açık |
| `GET` | `/api/auth/me` | Giriş yapmış kullanıcının profili | `verifyToken` |

### 2. Müşteri & Mağaza Vitrini (`/api/store` & `/api`)
| Metod | Endpoint | Açıklama | Yetki |
|---|---|---|---|
| `GET` | `/api/store/products` | Ürünleri arama, OEM kodu, marka, kategori ve fiyata göre listeleme | Açık |
| `GET` | `/api/store/products/:id` | Tek ürün detayı | Açık |
| `GET` | `/api/store/categories` | Kategori ve marka listesi (Sayaçlı) | Açık |
| `GET` | `/api/store/cart` | Müşterinin sepetini görüntüleme | `verifyMusteri` / Opsiyonel |
| `POST` | `/api/store/cart` | Sepete ürün ekleme | `verifyMusteri` / Opsiyonel |
| `DELETE` | `/api/store/cart/:itemId`| Sepetten ürün silme | `verifyMusteri` / Opsiyonel |
| `DELETE` | `/api/store/cart` | Sepeti temizleme | `verifyMusteri` / Opsiyonel |
| `POST` | `/api/store/orders` | Sipariş onaylama (`store.html` checkout) | `verifyMusteri` / Opsiyonel |
| `GET` | `/api/store/orders` | Müşterinin geçmiş siparişleri | `verifyMusteri` |
| `GET` | `/api/store/favorites` | Müşterinin favori ürün ID'leri | Opsiyonel |
| `POST` | `/api/store/favorites` | Favori ekleme / kaldırma | Opsiyonel |
| `GET` | `/api/store/notifications`| Bildirim merkezi | Opsiyonel |

### 3. Bayi Portali (`/api/bayi`)
| Metod | Endpoint | Açıklama | Yetki |
|---|---|---|---|
| `GET` | `/api/bayi/products` | Sadece bayinin kendi ürünleri | `verifyBayi` |
| `POST` | `/api/bayi/products` | Bayinin yeni ürün eklemesi | `verifyBayi` |
| `GET` | `/api/bayi/products/:id` | Bayinin tek ürün detayı | `verifyBayi` |
| `PUT` | `/api/bayi/products/:id` | Bayinin ürün bilgilerini güncellemesi | `verifyBayi` |
| `PATCH` | `/api/bayi/products/:id/stock` | Hızlı stok adedi güncelleme | `verifyBayi` |
| `DELETE` | `/api/bayi/products/:id` | Bayinin kendi ürününü silmesi | `verifyBayi` |
| `GET` | `/api/bayi/orders` | Bayinin ürünlerini içeren gelen siparişler | `verifyBayi` |
| `PATCH` | `/api/bayi/orders/:id/status`| Sipariş hazırlama / kargo durumu güncelleme | `verifyBayi` |
| `GET` | `/api/bayi/stats` | Bayi KPI istatistikleri (Kazanç, stok, satış) | `verifyBayi` |

### 4. Admin Yönetimi (`/api/admin`)
| Metod | Endpoint | Açıklama | Yetki |
|---|---|---|---|
| `GET` | `/api/admin/stats` | Sistem geneli dashboard metrikleri ve toplam ciro | `verifyAdmin` |
| `GET` | `/api/admin/users` | Tüm kullanıcıları rol ve duruma göre listeleme | `verifyAdmin` |
| `POST` | `/api/admin/users` | Yeni kullanıcı oluşturma (Admin, Bayi, Müşteri) | `verifyAdmin` |
| `PATCH` | `/api/admin/users/:id/role`| Kullanıcı rolünü değiştirme (RBAC) | `verifyAdmin` |
| `PATCH` | `/api/admin/users/:id/status`| Kullanıcıyı aktif / pasif yapma | `verifyAdmin` |
| `DELETE` | `/api/admin/users/:id` | Kullanıcı silme | `verifyAdmin` |
| `GET` | `/api/admin/products` | Tüm sisteme ait ürünleri görüntüleme | `verifyAdmin` |
| `DELETE` | `/api/admin/products/:id` | Herhangi bir ürünü sistemden kaldırma | `verifyAdmin` |
| `GET` | `/api/admin/orders` | Tüm platform siparişlerini izleme | `verifyAdmin` |
| `PATCH` | `/api/admin/orders/:id/status`| Sipariş durumunu yönetici yetkisiyle değiştirme | `verifyAdmin` |

---

## 🗄 Veritabanı Seçenekleri

- **SQLite (Varsayılan):** Sıfır konfigürasyonla anında çalışır. `prisma/dev.db` dosyasında tutulur.
- **PostgreSQL (Canlı Ortam):** PostgreSQL kullanmak için `prisma/schema.prisma` dosyasındaki `datasource db` bloğunda `provider = "postgresql"` yapmanız ve `.env` dosyasındaki `DATABASE_URL` satırını ayarlamanız yeterlidir:
  ```env
  DATABASE_URL="postgresql://kullanici:sifre@localhost:5432/giris_db?schema=public"
  ```
  Ardından `npx prisma db push` komutunu çalıştırmanız yeterlidir.

