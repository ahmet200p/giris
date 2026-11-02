// config.js - Global API Configuration
// prompt.md Kuralı: Değişken çakışmasını önlemek için sadece window üzerinden atanır, duplicate const kullanılmaz.
if (typeof window !== 'undefined') {
  window.API_BASE_URL = window.API_BASE_URL || "https://saas-g-ncel-10-10-2026simdi-main.onrender.com/api";
  window.API_BASE = window.API_BASE_URL;
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    API_BASE_URL: "https://saas-g-ncel-10-10-2026simdi-main.onrender.com/api"
  };
}
