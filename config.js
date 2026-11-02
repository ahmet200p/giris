/**
 * Global API Configuration (config.js)
 * ADIM 1: API BASE URL'NİN KESİN TANIMLANMASI VE KULLANIMI
 * Canlı backend adresi tanımlanmıştır (Not: Sonunda /api yoktur).
 */
const API_BASE_URL = "https://saas-g-ncel-10-10-2026simdi-main.onrender.com";

// Tarayıcı global nesnesine (window) bağla
if (typeof window !== 'undefined') {
  window.API_BASE_URL = API_BASE_URL;
  window.API_BASE = `${API_BASE_URL}/api`;
}

// Node.js / CommonJS ortamı için dışa aktar
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { API_BASE_URL };
}

