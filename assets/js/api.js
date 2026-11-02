/**
 * Merkezi API İstemcisi & Headless Köprüsü (assets/js/api.js)
 * ADIM 1: API BASE URL'NİN KESİN TANIMLANMASI VE KULLANIMI
 * Canlı backend adresi tanımlıdır (Not: Sonunda /api yoktur).
 */
const API_BASE_URL = (typeof window !== 'undefined' && window.API_BASE_URL) || "https://saas-g-ncel-10-10-2026simdi-main.onrender.com";

if (typeof window !== 'undefined') {
  window.API_BASE_URL = API_BASE_URL;
  window.API_BASE = `${API_BASE_URL}/api`;
}

(function () {
  /**
   * Merkezi apiFetch İstemcisi
   * Otomatik Bearer token, JSON serileştirme ve mutlak (absolute) URL kullanımı içerir.
   * Konsolda https://saas-g-ncel... ile başlayan tam URL'ye istek atar.
   */
  window.apiFetch = async function (endpoint, options = {}) {
    const cleanEndpoint = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
    const apiPath = cleanEndpoint.startsWith('/api') ? cleanEndpoint : `/api${cleanEndpoint}`;
    const url = `${API_BASE_URL}${apiPath}`;

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

  console.log(`[Headless API Köprüsü Hazır] Canlı URL: ${API_BASE_URL}/api`);
})();
