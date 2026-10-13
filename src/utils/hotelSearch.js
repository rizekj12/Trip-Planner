import { apiGet } from "./aiService";

export async function searchHotels(city, country) {
  const params = new URLSearchParams({ city, country: country || "" });
  const data = await apiGet(`/api/search-hotels?${params}`);
  return data.hotels || [];
}
