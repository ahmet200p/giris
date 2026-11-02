/**
 * Merkezi API İstemcisi & Headless Köprüsü (assets/js/api.js)
 * ADIM 1: API_BASE_URL ÇAKIŞMASINI TEMİZLE
 * Sadece TEK BİR YERDE const API_BASE_URL tanımlanmıştır.
 */
const API_BASE_URL = "https://saas-g-ncel-10-10-2026simdi-main.onrender.com/api";

if (typeof window !== 'undefined') {
  window.API_BASE_URL = API_BASE_URL;
  window.API_BASE = API_BASE_URL;

  // ADIM 2: selectCategory FONKSİYONUNUN GLOBAL SCOPE'TA TANIMLANMASI
  window.selectCategory = function (categoryName, e) {
    if (e) {
      if (typeof e.preventDefault === 'function') e.preventDefault();
      if (typeof e.stopPropagation === 'function') e.stopPropagation();
    }
    console.log("Seçilen Kategori:", categoryName);

    // Sayfa fonksiyonlarına yönlendir
    if (typeof window.applyCategoryFilter === 'function') {
      window.applyCategoryFilter(categoryName, e);
    } else if (typeof buildAndFetchFilters === 'function') {
      window.currentActiveCategory = (!categoryName || categoryName === 'Tüm Kategoriler' || categoryName === 'ALL') ? '' : categoryName.trim();
      buildAndFetchFilters();
    }
  };
}

(function () {
  /**
   * Merkezi apiFetch İstemcisi
   * Otomatik Bearer token, JSON serileştirme ve mutlak (absolute) URL kullanımı içerir.
   */
  window.apiFetch = async function (endpoint, options = {}) {
    const cleanEndpoint = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
    // Eğer endpoint zaten /api ile başlıyorsa /api/api olmasını engelle
    const path = cleanEndpoint.startsWith('/api/') ? cleanEndpoint.substring(4) : (cleanEndpoint === '/api' ? '' : cleanEndpoint);
    const url = `${API_BASE_URL}${path}`;

    const headers = {
      'Accept': 'application/json',
      ...(options.headers || {})
    };

    if (options.body && typeof options.body === 'object' && !(options.body instanceof FormData)) {
      headers['Content-Type'] = 'application/json';
      options.body = JSON.stringify(options.body);
    }

    const token = localStorage.getItem('token') || 
                  localStorage.getItem('jwt') || 
                  localStorage.getItem('authToken') || 
                  sessionStorage.getItem('token');

    if (token) {
      headers['Authorization'] = `Bearer ${token.replace(/^["']|["']$/g, '').trim()}`;
    }

    const tenantId = localStorage.getItem('tenantId');
    if (tenantId) {
      headers['X-Tenant-Id'] = tenantId;
      headers['X-Tenant-Slug'] = tenantId;
    }

    try {
      const response = await fetch(url, {
        ...options,
        headers
      });

      const contentType = response.headers.get('content-type') || '';
      let data = null;
      if (contentType.includes('application/json')) {
        data = await response.json();
      } else {
        data = await response.text();
      }

      if (!response.ok) {
        return {
          success: false,
          status: response.status,
          message: (data && data.message) || response.statusText,
          errors: data && data.errors,
          code: data && data.code
        };
      }

      return data;
    } catch (err) {
      console.warn(`[apiFetch Hatası] ${url}:`, err);
      return {
        success: false,
        message: 'Ağ bağlantı hatası veya sunucuya ulaşılamıyor.',
        error: err
      };
    }
  };

  /**
   * ÇİFT GİRİŞLİ AUTH YARDIMCILARI
   */
  // 1. Panel Girişi (Admin & Bayi)
  window.panelLogin = async function (email, password) {
    const res = await window.apiFetch('/auth/panel-login', {
      method: 'POST',
      body: { email, password }
    });
    if (res && res.success && res.data && res.data.token) {
      localStorage.setItem('token', res.data.token);
      localStorage.setItem('user', JSON.stringify(res.data.user));
    }
    return res;
  };

  // 2. Mağaza Girişi (Müşteri / B2B Alıcı)
  window.storeLogin = async function (email, password) {
    const res = await window.apiFetch('/auth/store-login', {
      method: 'POST',
      body: { email, password }
    });
    if (res && res.success && res.data && res.data.token) {
      localStorage.setItem('token', res.data.token);
      localStorage.setItem('user', JSON.stringify(res.data.user));
    }
    return res;
  };

  // 3. Oturum Kapatma
  window.logout = function () {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    sessionStorage.clear();
  };

  console.log(`[Headless API Köprüsü Hazır] Canlı URL: ${API_BASE_URL}`);
})();
