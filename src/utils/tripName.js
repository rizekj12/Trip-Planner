// Trip names in the app: shared/tripName.js, plus the signed-in viewer's home country
import { useAuth } from "../context/AuthContext";

export { joinCities, placeName, tripCities, tripName } from "../../shared/tripName.js";

// The signed-in viewer's home country (user_metadata.home_country), or null
export function useHomeCountry() {
  return useAuth().user?.user_metadata?.home_country || null;
}
