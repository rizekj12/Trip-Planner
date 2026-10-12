import React from "react";
import { destinationImage } from "../../data/destinationImages";
import { getCountryFlagOnly } from "../../utils/countryFlags";

const TILE_COLORS = [
  "from-indigo-500 to-purple-600",
  "from-pink-500 to-rose-600",
  "from-emerald-500 to-teal-600",
  "from-orange-500 to-amber-600",
  "from-cyan-500 to-blue-600",
  "from-violet-500 to-fuchsia-600",
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
