  import { getDecryptedToken } from "./tokenStorage";

export const prepareAuthHeaders = (headers) => {
  const token = getDecryptedToken("accessToken");
  if (token) {
    headers.set("Authorization", `Bearer ${token}`);
  }
  return headers;
};