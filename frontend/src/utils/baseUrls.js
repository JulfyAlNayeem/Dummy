// In production, use same origin (nginx proxies to backend)
// In development, use VITE_BASE_URL (direct backend connection)
export const BASE_URL = import.meta.env.PROD 
  ? window.location.origin + '/' 
  : (import.meta.env.VITE_BASE_URL || 'http://192.168.0.142:3001/');
  
export const AUTH_URL = `${BASE_URL}user/`;