// In production, use same origin (nginx proxies to backend)
// In development, use Vite proxy (/api) to avoid cross-origin cookie issues
export const BASE_URL = import.meta.env.PROD 
  ? window.location.origin + '/' 
  : '/api/';
  
export const AUTH_URL = `${BASE_URL}user/`;