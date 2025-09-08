import { HOTELS } from "./hotels";

export const days = [
  {
    key: "d1",
    date: "Thu (Tokyo Arrival)",
    title: "Arrival – Check‑in & Walk",
    hotel: HOTELS.tokyo_akiba,
    markers: ["akihabara"],
    notes: [
      "Arrive in Tokyo at ~7:30 PM.",
      "Check in at NOHGA Hotel Akihabara.",
      "Grab dinner nearby.",
      "Light evening walk / exploration."
    ],
  },
  {
    key: "d2",
    date: "Fri (Akihabara & Attractions)",
    title: "TeamLab, Akihabara, Pokémon & Bars",
    hotel: HOTELS.tokyo_akiba,
    markers: ["teamLab","akihabara","pokemonDX","pokemonCafe","kirbyCafe","imperialPalace","jumpShop","goldenGai"],
    notes: [
      "10:30 AM – teamLab Planets (Toyosu) (~17 mins from hotel).",
      "Walk to Akihabara (~15 mins).",
      "Pokémon Center DX & lunch at Pokémon Café.",
      "Stop by Kirby Café (15‑min walk from Pokémon DX).",
      "Walk to Imperial Palace (guided tour optional).",
      "Jump Shop near hotel.",
      "Evening in Shinjuku Golden Gai + local bars."
    ],
  },
  {
    key: "d3",
    date: "Sat (Shibuya)",
    title: "Shibuya Day + Nightlife",
    hotel: HOTELS.tokyo_akiba,
    markers: ["pokemonShibuya","shibuyaCrossing","nintendoShibuya","jumpShopShibuya","shibuyaSky"],
    notes: [
      "Pokémon Center Shibuya.",
      "Famous Shibuya Crossing.",
      "Nintendo Store Tokyo (Shibuya).",
      "Jump Shop Shibuya (optional).",
      "Shibuya Sky observation deck.",
      "Nighttime salsa dancing / clubbing."
    ],
  },
  {
    key: "d4",
    date: "Sun (Harajuku & Photos)",
    title: "Harajuku Shopping + Photoshoot",
    hotel: HOTELS.tokyo_akiba,
    markers: ["gotokuji","meijiShrine","harajuku","tokyoMega","photoshoot"],
    notes: [
      "Morning: Gotokuji Temple (lucky cat) or Meiji Shrine.",
      "Visit Tokyo Mega Pokémon Card Store (near Pokémon GO Lab).",
      "Shopping in Harajuku (Nike, Bape, local boutiques).",
      "Professional photoshoot in Shibuya.",
      "Evening: clubbing or bars (optional)."
    ],
  },
  {
    key: "d5",
    date: "Mon (Tokyo → Kyoto)",
    title: "Travel to Kyoto",
    hotel: HOTELS.kyoto_rokujo,
    markers: ["tokyoStation","kyotoStation"],
    notes: [
      "Breakfast in Tokyo + last‑minute shopping (~1 hr).",
      "Depart Tokyo Station ~1–2 PM; arrive Kyoto ~5–6 PM.",
      "Walk 10–15 mins to Oriental Hotel Kyoto Rokujo.",
      "Dinner + light exploration of Kyoto."
    ],
  },
  {
    key: "d6",
    date: "Tue (Kyoto & Osaka)",
    title: "Fushimi Sunrise + Kyoto + Osaka Eve",
    hotel: HOTELS.kyoto_rokujo,
    markers: ["fushimiInari","ninenzaka","otagi","nishiki","samurai"],
    notes: [
      "5:00 AM – Fushimi Inari Shrine (sunrise hike).",
      "Stroll Ninenzaka Street.",
      "Visit Otagi Nembutsu‑ji Temple (statues).",
      "Nishiki Market for food & shopping.",
      "Samurai experience (hands‑on).",
      "Optional: another shrine.",
      "Evening: quick Osaka visit."
    ],
  },
  {
    key: "d7",
    date: "Wed (Nagoya)",
    title: "Ghibli Park Day Trip",
    hotel: HOTELS.kyoto_rokujo,
    markers: ["ghibliPark","nagoyaCastle","osu"],
    notes: [
      "Day trip to Ghibli Park (Nagoya).",
      "Explore Nagoya Castle.",
      "Osu Shopping District."
    ],
  },
  {
    key: "d8",
    date: "Thu (Kyoto & Osaka)",
    title: "Naruto Park + Osaka + Spa",
    hotel: HOTELS.kyoto_rokujo,
    markers: ["narutoPark","osakaDowntown","katsuoji","hotelMitsuiSpa"],
    notes: [
      "Day trip to Naruto Theme Park.",
      "Explore Osaka Downtown & stores.",
      "Visit Katsuo‑ji Temple.",
      "Relax at Hotel Mitsui Kyoto Spa.",
      "Enjoy Kyoto/Osaka nightlife."
    ],
  },
  {
    key: "d9",
    date: "Fri (Kyoto → Tokyo)",
    title: "Back to Tokyo + Nightlife",
    hotel: HOTELS.tokyo_tamachi,
    markers: ["kyotoLastShrine","pokemonOsaka","shinkansenBack","tokyoNightlife"],
    notes: [
      "Morning: one last Kyoto shrine/temple.",
      "Stop at Pokémon Center Osaka.",
      "Afternoon train back to Tokyo.",
      "One final night of Tokyo nightlife."
    ],
  },
  {
    key: "d10",
    date: "Sat (Departure)",
    title: "Tokyo Departure",
    hotel: HOTELS.tokyo_tamachi,
    markers: ["lastShopping","airport"],
    notes: [
      "Breakfast + last‑minute shopping.",
      "Head to Haneda/Narita Airport for flight home."
    ],
  },
];
