# KRİTİK GÖREV: Değişken Çakışması (SyntaxError) ve Tanımsız Fonksiyon Onarımı

**HATA TESPİTİ:**
Konsolda şu hatalar alınıyor:
1. `Uncaught SyntaxError: Identifier 'API_BASE_URL' has already been declared` (Değişken çakışması)
2. `Uncaught ReferenceError: selectCategory is not defined` (HTML'deki `onclick` fonksiyonu JS'de bulunamıyor)

Lütfen `store.html` ve ona bağlı tüm JS (ve `api.js`) dosyalarında şu 3 adımı DERHAL uygula:

### ADIM 1: `API_BASE_URL` ÇAKIŞMASINI TEMİZLE
- `api.js` dosyasını ve `store.html` içindeki `<script>` etiketlerini kontrol et.
- `API_BASE_URL` veya `BASE_URL` tanımı sadece TEK BİR YERDE (tercihen `api.js` içinde) `const API_BASE_URL = "https://saas-g-ncel-10-10-2026simdi-main.onrender.com/api";` olarak tanımlanmalıdır.
- Diğer tüm dosyalardaki aynı isimli değişken atamalarını SİL. Eğer aynı dosyada tekrar tanımlanmışsa (Örn: `let API_BASE_URL = ...`), bu fazlalıkları tamamen temizle. Kodun hata fırlatmadan bu global değişkeni okuyabildiğinden emin ol.

### ADIM 2: `selectCategory` FONKSİYONUNU TANIMLA VEYA TEMİZLE
- `store.html` içindeki kategori butonlarında muhtemelen `onclick="selectCategory('Fren Sistemi')"` gibi satıriçi (inline) bir JavaScript çağrısı var. Ancak bu fonksiyon JS dosyasında tanımlanmamış.
- JS dosyana şu fonksiyonu global scope'ta (sayfanın her yerinden erişilebilecek şekilde) ekle:
  ```javascript
  window.selectCategory = function(categoryName) {
      console.log("Seçilen Kategori:", categoryName);
      // Burada ürünleri yeniden fetch edecek (filtreleyecek) kodu çağır
      // Örn: loadProducts({ category: categoryName });
  };