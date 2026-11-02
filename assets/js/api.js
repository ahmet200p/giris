/**
 * Merkezi API İstemcisi & Headless Köprüsü (assets/js/api.js)
 * store.html ve diğer frontend'ler için backend ile tam entegrasyon sağlar.
 */

(function () {
  const origin = window.location.origin;
  const isHttp = origin && (origin.startsWith('http://') || origin.startsWith('https://'));
  
  // API Taban Adresi: Sunucu üzerinden açıldıysa göreceli /api, dosya olarak açıldıysa localhost:5000/api
  window.API_BASE = window.API_BASE || (isHttp ? (origin + '/api') : 'http://localhost:5000/api');

  /**
   * Merkezi apiFetch İstemcisi
   * Otomatik Bearer token, JSON serileştirme ve hata yakalama içerir.
   */
  window.apiFetch = async function (endpoint, options = {}) {
    const cleanEndpoint = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
    const url = `${window.API_BASE}${cleanEndpoint}`;

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
          errors: data && data.errors
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
   * ADIM 2: ÇİFT GİRİŞLİ AUTH YARDIMCILARI
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

  console.log(`[Headless API Köprüsü Hazır] Bağlantı: ${window.API_BASE}`);
})();

