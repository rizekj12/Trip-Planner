import React from "react";
import { MapPin } from "lucide-react";
import { countryCode, flagForCode } from "../utils/countryFlags";

// Flag emoji for a destination name, or a map pin if we don't know its code
export default function CountryFlag({ name, size = "text-lg" }) {
  const code = countryCode(name);
  return code
    ? <span className={`${size} leading-none`} aria-hidden="true">{flagForCode(code)}</span>
    : <MapPin size={16} className="text-gray-400" aria-hidden="true" />;
}
