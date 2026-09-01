// Dynamic API Base URL resolver for local development vs live production deployment
export const getApiBaseUrl = () => {
  if (import.meta.env.VITE_API_BASE_URL) {
    return import.meta.env.VITE_API_BASE_URL;
  }
  
  // If running locally in browser (localhost or 127.0.0.1)
  if (typeof window !== 'undefined' && (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1')) {
    return 'http://127.0.0.1:8000/api/v1';
  }

  // Production Vercel deployment pointing to live Render FastAPI backend
  return 'https://forensight-api.onrender.com/api/v1';
};

export const API_BASE_URL = getApiBaseUrl();
