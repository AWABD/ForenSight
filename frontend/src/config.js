// Dynamic API Base URL resolver for local development vs live production deployment
export const getApiBaseUrl = () => {
  let url = import.meta.env.VITE_API_BASE_URL;
  
  if (!url || !url.trim()) {
    // If running locally in browser (localhost or 127.0.0.1)
    if (typeof window !== 'undefined' && (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1')) {
      url = 'http://127.0.0.1:8000/api/v1';
    } else {
      // Production Vercel deployment pointing to live Render FastAPI backend
      url = 'https://forensight-api.onrender.com/api/v1';
    }
  }

  // Sanitize URL: strip trailing slashes and ensure /api/v1 endpoint prefix is present
  url = url.replace(/\/+$/, '');
  if (!url.endsWith('/api/v1')) {
    url = `${url}/api/v1`;
  }

  return url;
};

export const API_BASE_URL = getApiBaseUrl();
