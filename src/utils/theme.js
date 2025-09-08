export const TOKYO_LAVENDER = "bg-[rgb(229,222,243)]"; // deeper soft purple for Tokyo
export const LAVENDER = "bg-[rgb(236,230,245)]"; // shared soft lavender

export const THEMES = {
  tokyo: {
    bg: "/bg-tokyo.png",
    tabsBar: "bg-indigo-800",
    tabActive: "bg-indigo-600 text-white shadow",
    tabIdle: `${TOKYO_LAVENDER} text-zinc-800 hover:bg-indigo-50 border border-zinc-300`,
    card: `${TOKYO_LAVENDER} text-zinc-900`,
    sub: TOKYO_LAVENDER,
    header: "bg-indigo-600 text-white",
    markerColor: "#4f46e5", // Indigo 600
  },
  kansai: {
    bg: "/bg-kyoto.png",
    tabsBar: "bg-red-800",
    tabActive: "bg-red-600 text-white shadow",
    tabIdle: `${LAVENDER} text-rose-900 hover:bg-rose-50 border border-rose-300`,
    card: `${LAVENDER} text-rose-900`,
    sub: LAVENDER,
    header: "bg-red-600 text-white",
    markerColor: "#dc2626", // Red 600
  },
};

// Kyoto / Osaka / Nagoya days
export const KANSAI_DAYS = new Set(["d5", "d6", "d7", "d8"]);
