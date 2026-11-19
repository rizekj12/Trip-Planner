import React from "react";
import { destinationImage } from "../../data/destinationImages";
import { getCountryFlagOnly } from "../../utils/countryFlags";

const TILE_COLORS = [
  "from-brand-500 to-orchid-600",
  "from-coral-500 to-coral-600",
  "from-emerald-500 to-aqua-600",
  "from-mango-500 to-mango-600",
  "from-aqua-500 to-azure-600",
  "from-orchid-500 to-coral-600",
];
const tileFor = (name = "") =>
  TILE_COLORS[[...name].reduce((sum, ch) => sum + ch.charCodeAt(0), 0) % TILE_COLORS.length];

// Destination photo, or a colored tile with the flag when we don't have one.
// `muted` greys it out (past trips); size and shape come from className.
export default function TripThumb({ country, className = "", muted = false, flagSize = "text-3xl" }) {
  const image = destinationImage(country);
  if (image) {
    return (
      <img
        src={image}
        alt={country}
        loading="lazy"
        className={`object-cover ${muted ? "grayscale-[45%]" : ""} ${className}`}
      />
    );
  }
  return (
    <div
      className={`flex items-center justify-center bg-gradient-to-br ${tileFor(country)} ${muted ? "grayscale-[45%]" : ""} ${className}`}
      aria-hidden="true"
    >
      <span className={`${flagSize} drop-shadow`}>{getCountryFlagOnly(country)}</span>
    </div>
  );
}
