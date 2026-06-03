// Production: use /api prefix (nginx strips it before proxying to backend)
// Development: use /api prefix (Vite proxy handles it, works for mobile testing)
export const BASE_URL = import.meta.env.PROD 
  ? window.location.origin + '/api/' 
  : '/api/';
  
export const AUTH_URL = `${BASE_URL}user/`;