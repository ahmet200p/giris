# KRİTİK GÖREV: Vitrin (Store) API 404 Hatalarının Çözümü ve Yol (Routing) Onarımı

**HATA TESPİTİ:**
Bayi panelinden ürün eklenmiş olmasına rağmen, vitrin sayfası (`store.html`) ürünleri çekemiyor ve konsolda sürekli `/api/store/products` ile `/api/products` için `404 Not Found` hataları veriyor. Bu, `fetch` isteklerinin tam URL'yi (Render sunucusunu) kullanmadığını, bunun yerine bulunduğu klasöre (göreceli yola) veya yanlış bir endpoint'e istek attığını gösteriyor.

Lütfen `store.html` ve bağlı JavaScript dosyasında şu onarımları DERHAL yap:

### ADIM 1: API BASE URL'NİN KESİN TANIMLANMASI VE KULLANIMI
- `store.html` sayfasının `<head>` kısmında `config.js` veya API adresini tanımladığımız betiğin düzgün yüklendiğinden emin ol.
- JavaScript dosyasının en üstünde global bir değişken olarak canlı backend adresinin tanımlı olduğundan emin ol:
  `const API_BASE_URL = "https://saas-g-ncel-10-10-2026simdi-main.onrender.com";` (Not: Sonunda `/api` olmasın).

### ADIM 2: FETCH İSTEKLERİNİN (ENDPOINT) DÜZELTİLMESİ
- Ürünleri sunucudan çeken tüm `fetch()` veya `axios` fonksiyonlarını bul (Örneğin `fetchProducts` veya `loadProducts` fonksiyonu).
- Bu isteklerde kullanılan göreceli (relative) URL'leri (örneğin `fetch('/api/products')`), mutlak (absolute) URL'lerle değiştirecek şekilde güncelle.
- Backend'de (Node.js tarafında) ürünleri listeleyen GET endpoint'i tam olarak hangisiyse (örneğin `router.get('/products')` ise ve bu router `/api` altında çalışıyorsa), `fetch` isteğini buna tam uyumlu hale getir:
  **Doğru Kullanım Örneği:** `fetch(`${API_BASE_URL}/api/products`)` veya Backend'deki route yapın nasılsa ona göre `fetch(`${API_BASE_URL}/api/store/products`)`.

### ADIM 3: BACKEND ROUTE KONTROLÜ
- Backend (Node.js) tarafında `app.js` veya `server.js` dosyasını aç.
- Frontend'in istek attığı endpoint'in (örneğin `/api/store/products` veya `/api/products`) gerçekten tanımlı olduğundan ve `app.use('/api', ...)` gibi yönlendirmelerin doğru kurulduğundan emin ol. Bir harf hatası bile 404 dönmesine sebep olur.

**EMİR:** Bu 404 hataları tamamen Frontend'in yanlış yere istek atmasından kaynaklanıyor. Konsolda `https://saas-g-ncel...` ile başlayan TAM adresin görünmesini sağlayacak şekilde `fetch` çağrılarını düzelt.