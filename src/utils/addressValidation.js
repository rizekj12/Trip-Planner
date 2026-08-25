const isDevelopment = import.meta.env.DEV;
const backendUrl = isDevelopment ? "http://localhost:3001" : "";

export async function validateAddress(address) {
  const params = new URLSearchParams({ address });
  const response = await fetch(`${backendUrl}/api/validate-address?${params}`);

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.error || "Failed to validate address");
  }

  return response.json();
}
