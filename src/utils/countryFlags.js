// ISO 3166-1 alpha-2 codes for every destination in src/data/countriesAndCities.js,
// keyed by lowercase name (plus a few common aliases). Used for flag emoji.
const COUNTRY_CODES = {
  afghanistan: "AF", albania: "AL", algeria: "DZ", andorra: "AD", angola: "AO",
  "antigua and barbuda": "AG", argentina: "AR", armenia: "AM", australia: "AU", austria: "AT",
  azerbaijan: "AZ", bahamas: "BS", bahrain: "BH", bangladesh: "BD", barbados: "BB",
  belarus: "BY", belgium: "BE", belize: "BZ", benin: "BJ", bhutan: "BT", bolivia: "BO",
  "bosnia and herzegovina": "BA", botswana: "BW", brazil: "BR", brunei: "BN", bulgaria: "BG",
  "burkina faso": "BF", burundi: "BI", cambodia: "KH", cameroon: "CM", canada: "CA",
  "cape verde": "CV", "central african republic": "CF", chad: "TD", chile: "CL", china: "CN",
  colombia: "CO", comoros: "KM", congo: "CG", "costa rica": "CR", croatia: "HR", cuba: "CU",
  cyprus: "CY", "czech republic": "CZ", denmark: "DK", djibouti: "DJ", dominica: "DM",
  "dominican republic": "DO", ecuador: "EC", egypt: "EG", "el salvador": "SV",
  "equatorial guinea": "GQ", eritrea: "ER", estonia: "EE", eswatini: "SZ", ethiopia: "ET",
  fiji: "FJ", finland: "FI", france: "FR", gabon: "GA", gambia: "GM", georgia: "GE",
  germany: "DE", ghana: "GH", greece: "GR", grenada: "GD", guatemala: "GT", guinea: "GN",
  "guinea-bissau": "GW", guyana: "GY", haiti: "HT", honduras: "HN", hungary: "HU",
  iceland: "IS", india: "IN", indonesia: "ID", iran: "IR", iraq: "IQ", ireland: "IE",
  israel: "IL", italy: "IT", jamaica: "JM", japan: "JP", jordan: "JO", kazakhstan: "KZ",
  kenya: "KE", kiribati: "KI", kuwait: "KW", kyrgyzstan: "KG", laos: "LA", latvia: "LV",
  lebanon: "LB", lesotho: "LS", liberia: "LR", libya: "LY", liechtenstein: "LI",
  lithuania: "LT", luxembourg: "LU", madagascar: "MG", malawi: "MW", malaysia: "MY",
  maldives: "MV", mali: "ML", malta: "MT", mauritania: "MR", mauritius: "MU", mexico: "MX",
  moldova: "MD", monaco: "MC", mongolia: "MN", montenegro: "ME", morocco: "MA",
  mozambique: "MZ", myanmar: "MM", namibia: "NA", nepal: "NP", netherlands: "NL",
  "new zealand": "NZ", nicaragua: "NI", niger: "NE", nigeria: "NG", "north korea": "KP",
  "north macedonia": "MK", norway: "NO", oman: "OM", pakistan: "PK", palau: "PW",
  panama: "PA", "papua new guinea": "PG", paraguay: "PY", peru: "PE", philippines: "PH",
  poland: "PL", portugal: "PT", qatar: "QA", romania: "RO", russia: "RU", rwanda: "RW",
  "saint kitts and nevis": "KN", "saint lucia": "LC", "saint vincent and the grenadines": "VC",
  samoa: "WS", "san marino": "SM", "saudi arabia": "SA", senegal: "SN", serbia: "RS",
  seychelles: "SC", "sierra leone": "SL", singapore: "SG", slovakia: "SK", slovenia: "SI",
  "solomon islands": "SB", somalia: "SO", "south africa": "ZA", "south korea": "KR",
  "south sudan": "SS", spain: "ES", "sri lanka": "LK", sudan: "SD", suriname: "SR",
  sweden: "SE", switzerland: "CH", syria: "SY", taiwan: "TW", tajikistan: "TJ",
  tanzania: "TZ", thailand: "TH", "timor-leste": "TL", togo: "TG", tonga: "TO",
  "trinidad and tobago": "TT", tunisia: "TN", turkey: "TR", turkmenistan: "TM", tuvalu: "TV",
  uganda: "UG", ukraine: "UA", "united arab emirates": "AE", "united kingdom": "GB",
  "united states": "US", uruguay: "UY", uzbekistan: "UZ", vanuatu: "VU", "vatican city": "VA",
  venezuela: "VE", vietnam: "VN", yemen: "YE", zambia: "ZM", zimbabwe: "ZW",
  // Territories
  "puerto rico": "PR", "u.s. virgin islands": "VI", guam: "GU", "northern mariana islands": "MP",
  "american samoa": "AS", anguilla: "AI", aruba: "AW", bermuda: "BM", bonaire: "BQ",
  "british virgin islands": "VG", "cayman islands": "KY", "curaçao": "CW",
  "faroe islands": "FO", "french polynesia": "PF", gibraltar: "GI", greenland: "GL",
  guadeloupe: "GP", "hong kong": "HK", macau: "MO", martinique: "MQ",
  "new caledonia": "NC", "réunion": "RE", "sint maarten": "SX",
  "turks and caicos islands": "TC",
  // Aliases
  uk: "GB", usa: "US",
};

// Region code (e.g. "US") -> lowercase destination name, for guessing a user's home country
const NAME_BY_CODE = {};
for (const [name, code] of Object.entries(COUNTRY_CODES)) {
  if (name !== "uk" && name !== "usa" && !NAME_BY_CODE[code]) NAME_BY_CODE[code] = name;
}

export function countryCode(countryName) {
  return countryName ? COUNTRY_CODES[countryName.toLowerCase().trim()] || null : null;
}

// "US" -> 🇺🇸 (regional indicator letters)
export function flagForCode(code) {
  return code.toUpperCase().split("").map((c) => String.fromCodePoint(127397 + c.charCodeAt(0))).join("");
}

// Lowercase destination name for a region code, or null
export function countryNameForCode(code) {
  return code ? NAME_BY_CODE[code.toUpperCase()] || null : null;
}

export function getCountryFlag(countryName) {
  const code = countryCode(countryName);
  return code ? `${flagForCode(code)} ✈️` : "✈️";
}

export function getCountryFlagOnly(countryName) {
  const code = countryCode(countryName);
  return code ? flagForCode(code) : "✈️";
}
