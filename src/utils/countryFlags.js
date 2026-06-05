const COUNTRY_CODES = {
  afghanistan: "AF", albania: "AL", algeria: "DZ", argentina: "AR",
  australia: "AU", austria: "AT", bahamas: "BS", bahrain: "BH",
  bangladesh: "BD", belgium: "BE", bolivia: "BO", brazil: "BR",
  canada: "CA", chile: "CL", china: "CN", colombia: "CO",
  "costa rica": "CR", croatia: "HR", cuba: "CU", "czech republic": "CZ",
  denmark: "DK", "dominican republic": "DO", ecuador: "EC", egypt: "EG",
  ethiopia: "ET", finland: "FI", france: "FR", germany: "DE",
  ghana: "GH", greece: "GR", guatemala: "GT", honduras: "HN",
  hungary: "HU", iceland: "IS", india: "IN", indonesia: "ID",
  iran: "IR", iraq: "IQ", ireland: "IE", israel: "IL",
  italy: "IT", jamaica: "JM", japan: "JP", jordan: "JO",
  kenya: "KE", kuwait: "KW", lebanon: "LB", malaysia: "MY",
  maldives: "MV", mexico: "MX", morocco: "MA", netherlands: "NL",
  "new zealand": "NZ", nicaragua: "NI", nigeria: "NG", norway: "NO",
  pakistan: "PK", panama: "PA", paraguay: "PY", peru: "PE",
  philippines: "PH", poland: "PL", portugal: "PT", "puerto rico": "PR",
  qatar: "QA", romania: "RO", russia: "RU", "saudi arabia": "SA",
  senegal: "SN", singapore: "SG", "south africa": "ZA", "south korea": "KR",
  spain: "ES", "sri lanka": "LK", sweden: "SE", switzerland: "CH",
  taiwan: "TW", thailand: "TH", turkey: "TR", ukraine: "UA",
  "united arab emirates": "AE", "united kingdom": "GB", uk: "GB",
  "united states": "US", usa: "US", uruguay: "UY", venezuela: "VE",
  vietnam: "VN", zimbabwe: "ZW",
};

export function getCountryFlag(countryName) {
  if (!countryName) return "✈️";
  const code = COUNTRY_CODES[countryName.toLowerCase().trim()];
  if (!code) return "✈️";
  const flag = code
    .toUpperCase()
    .split("")
    .map((c) => String.fromCodePoint(127397 + c.charCodeAt(0)))
    .join("");
  return `${flag} ✈️`;
}

export function getCountryFlagOnly(countryName) {
  if (!countryName) return "✈️";
  const code = COUNTRY_CODES[countryName.toLowerCase().trim()];
  if (!code) return "✈️";
  return code
    .toUpperCase()
    .split("")
    .map((c) => String.fromCodePoint(127397 + c.charCodeAt(0)))
    .join("");
}
