const isDevelopment = import.meta.env.DEV;
const backendUrl = isDevelopment ? "http://localhost:3001" : "";

export async function searchHotels(city, country) {
  const params = new URLSearchParams({ city, country: country || "" });
  const response = await fetch(`${backendUrl}/api/search-hotels?${params}`);

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.error || "Failed to search hotels");
  }

  const data = await response.json();
  return data.hotels || [];
}
