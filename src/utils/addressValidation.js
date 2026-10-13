import { apiGet } from "./aiService";

export async function validateAddress(address) {
  const params = new URLSearchParams({ address });
  return apiGet(`/api/validate-address?${params}`);
}
