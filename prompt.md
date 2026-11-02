# GÖREV: Müşteri Vitrini (B2B Store) Dinamik Veri ve Kasa Entegrasyonu

`store.html` ve bağlı JS dosyasını incele. Tasarımın (UI) HTML/CSS yapısına ve class'larına HİÇ DOKUNMADAN şu işlemleri yap:

1. DİNAMİK LİSTELEME & FİLTRELEME: Sol menüdeki filtreleri (Marka, Kategori, Fiyat vb.) toplayan bir event listener yaz. Bu filtreleri query string yaparak `GET ${API_BASE_URL}/store/products` adresine istek at. Dönen verileri ekrandaki HTML şablonuna bas. Sol menüdeki adet sayılarını dönen veriye göre dinamik güncelle.
2. SEPET VE TOKEN: Sepete ekleme işlemlerini LocalStorage'da tut. Üst menüdeki "Sepetim" butonuna sağdan açılan (Offcanvas) sepeti bağla.
3. ÖDEME MODALI VE SİPARİŞ: Sepette "Siparişi Onayla"ya basılınca ekrana "Adres ve Kredi Kartı (Checkout)" modalı aç. Modal formunda `e.preventDefault()` kullan (hata mesajları ekranı kapatmasın). Başarılı form sonrası `POST ${API_BASE_URL}/store/orders` adresine isteği gönder. Header kısmına KESİNLİKLE `'Authorization': 'Bearer ' + localStorage.getItem('token')` ekle.