// With HTTP-only cookies, tokens are sent automatically
// No need to manually add Authorization headers
export const prepareAuthHeaders = (headers: any): any => {
  // Cookies are handled automatically by the browser
  return headers;
};