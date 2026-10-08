import React from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { ArrowLeft, Plane } from "lucide-react";
import SkyBackground from "./SkyBackground";
import { getCountryFlagOnly } from "../utils/countryFlags";

// One "lap" of continents; drawn three times side by side and slid left by one lap,
// so the loop is seamless and reads as a spinning globe.
const LAP = 200;
const CONTINENTS = [
  // Americas
  "M20,40 C35,30 55,35 52,55 C50,70 38,72 40,85 C42,100 55,105 50,125 C46,135 38,128 35,115 C30,100 22,95 25,80 C28,65 10,55 20,40 Z",
  // Europe / Africa
  "M95,35 C110,28 125,35 120,48 C115,55 105,52 108,62 C120,70 128,85 118,105 C110,120 100,118 98,105 C95,92 88,85 92,72 C95,62 85,45 95,35 Z",
  // Asia
  "M140,30 C160,25 185,32 190,45 C195,58 178,60 170,68 C162,75 150,70 145,60 C140,52 130,38 140,30 Z",
  // Australia
  "M165,100 C178,96 190,102 186,112 C182,120 168,120 163,113 C160,108 158,103 165,100 Z",
];

function SpinningGlobe() {
  return (
    <svg viewBox="0 0 160 160" className="h-40 w-40 drop-shadow-2xl" aria-hidden>
      <defs>
        <clipPath id="globe-clip">
          <circle cx="80" cy="80" r="70" />
        </clipPath>
        <radialGradient id="globe-ocean" cx="40%" cy="35%" r="75%">
          <stop offset="0%" stopColor="#60a5fa" />
          <stop offset="100%" stopColor="#1e3a8a" />
        </radialGradient>
        <radialGradient id="globe-shade" cx="35%" cy="30%" r="80%">
          <stop offset="0%" stopColor="#ffffff" stopOpacity="0.35" />
          <stop offset="55%" stopColor="#ffffff" stopOpacity="0" />
          <stop offset="100%" stopColor="#000000" stopOpacity="0.45" />
        </radialGradient>
      </defs>

      <circle cx="80" cy="80" r="70" fill="url(#globe-ocean)" />

      <g clipPath="url(#globe-clip)">
        <motion.g
          animate={{ x: [0, -LAP] }}
          transition={{ duration: 10, ease: "linear", repeat: Infinity }}
        >
          {[0, 1, 2].map((i) => (
            <g key={i} transform={`translate(${i * LAP - 20}, 0)`}>
              {CONTINENTS.map((d) => (
                <path key={d} d={d} fill="#34d399" fillOpacity="0.9" />
              ))}
            </g>
          ))}
        </motion.g>

        {/* Latitude lines */}
        {[45, 80, 115].map((y) => (
          <ellipse key={y} cx="80" cy={y} rx="70" ry="6" fill="none" stroke="white" strokeOpacity="0.15" />
        ))}
      </g>

      <circle cx="80" cy="80" r="70" fill="url(#globe-shade)" />
    </svg>
  );
}

export default function GeneratingScreen({ formData }) {
  const country = formData?.country;
  const cities = (formData?.cities || []).map((c) => c.name).filter(Boolean);

  return (
    <div className="min-h-screen text-white relative flex flex-col">
      <SkyBackground />

      <div className="px-6 pt-6 md:px-12">
        <Link
          to="/"
          className="inline-flex items-center gap-2 rounded-xl px-3 py-2 bg-white/15 text-white backdrop-blur ring-1 ring-white/20 hover:bg-white/25 transition text-sm"
        >
          <ArrowLeft size={16} />
          My Trips
        </Link>
      </div>

      <div className="flex-1 flex flex-col items-center justify-center px-6 pb-16 text-center">
        {/* Globe with a plane circling it */}
        <div className="relative h-64 w-64 flex items-center justify-center mb-8">
          <div className="absolute inset-4 rounded-full border-2 border-dashed border-white/25" />
          <SpinningGlobe />
          <motion.div
            className="absolute inset-0"
            animate={{ rotate: 360 }}
            transition={{ duration: 6, ease: "linear", repeat: Infinity }}
          >
            {/* Sits on the top of the orbit; rotated so the nose points along the path */}
            <div className="absolute left-1/2 top-4 -translate-x-1/2 -translate-y-1/2">
              <Plane size={30} className="rotate-45 fill-white text-white drop-shadow-lg" />
            </div>
          </motion.div>
        </div>

        <motion.h1
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-3xl font-extrabold tracking-tight drop-shadow md:text-4xl"
        >
          Itinerary creation in progress
          <motion.span
            animate={{ opacity: [0.2, 1, 0.2] }}
            transition={{ duration: 1.5, repeat: Infinity }}
          >
            …
          </motion.span>
        </motion.h1>

        {country && (
          <p className="mt-3 text-lg text-white/90 drop-shadow">
            {getCountryFlagOnly(country)} {country}
            {cities.length > 0 && <span className="text-white/70"> · {cities.join(", ")}</span>}
          </p>
        )}

        <motion.p
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15 }}
          className="mt-4 max-w-md text-white/80 drop-shadow"
        >
          This may take a few minutes, but if you leave this page your itinerary will
          still appear in your dashboard when it's ready!
        </motion.p>
      </div>
    </div>
  );
}
