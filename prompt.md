# GÖREV: Canlı Backend Köprüsü Kurulumu

Tüm frontend (Vitrin, Bayi ve Admin) klasörlerinin ortak kullanacağı kök dizine `api.js` (veya `config.js`) oluştur.
1. Dosya içine şu URL'yi tanımla ve export et: 
   `const API_BASE_URL = "https://saas-g-ncel-10-10-2026simdi-main.onrender.com/api";`
2. `store.html`, `bayi.html` ve `admin.html` dosyalarının `<head>` kısmına bu dosyayı ilk script olarak ekle. `localhost` içeren tüm eski fetch/axios isteklerini `API_BASE_URL` değişkeni ile değiştir.