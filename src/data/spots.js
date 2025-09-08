import { spotImage } from "../imgData";
import { yt, gmaps } from "../utils/helpers";

export const spots = {
  akihabara: {
    title: "Akihabara - Electric Town",
    coords: [35.6984, 139.773],
    img: spotImage.akihabara,
    links: { youtube: yt("Akihabara tour"), maps: gmaps("Akihabara") },
  },
  pokemonDX: {
    title: "Pokémon Center DX & Pokémon Café (Nihonbashi)",
    coords: [35.6836, 139.7731],
    img: spotImage.pokemonDX,
    links: {
      youtube: yt("Pokemon Center DX Tokyo"),
      maps: gmaps("Pokémon Center DX Nihonbashi"),
    },
  },
  imperialPalace: {
    title: "Tokyo Imperial Palace",
    coords: [35.6852, 139.7528],
    img: spotImage.imperialPalace,
    links: {
      youtube: yt("Tokyo Imperial Palace"),
      maps: gmaps("Tokyo Imperial Palace"),
    },
  },
  nikeHarajuku: {
    title: "Nike Harajuku",
    coords: [35.6702, 139.7038],
    img: spotImage.nikeHarajuku,
    links: { youtube: yt("Nike Harajuku"), maps: gmaps("Nike Harajuku") },
  },
  jumpHarajuku: {
    title: "JUMP SHOP Harajuku",
    coords: [35.6715, 139.7058],
    img: spotImage.jumpHarajuku,
    links: {
      youtube: yt("Jump Shop Harajuku"),
      maps: gmaps("JUMP SHOP Harajuku"),
    },
  },
  meijiShrine: {
    title: "Meiji Shrine",
    coords: [35.6764, 139.6993],
    img: spotImage.meijiShrine,
    links: { youtube: yt("Meiji Shrine"), maps: gmaps("Meiji Jingu Shrine") },
  },
  shibuyaCrossing: {
    title: "Shibuya Crossing",
    coords: [35.6595, 139.7005],
    img: spotImage.shibuyaCrossing,
    links: {
      youtube: yt("Shibuya Crossing live"),
      maps: gmaps("Shibuya Crossing"),
    },
  },
  shibuyaSky: {
    title: "Shibuya SKY (Scramble Square)",
    coords: [35.658, 139.702],
    img: spotImage.shibuyaSky,
    links: { youtube: yt("Shibuya Sky"), maps: gmaps("Shibuya Sky") },
  },
  nintendoTokyo: {
    title: "Nintendo TOKYO (PARCO)",
    coords: [35.6618, 139.6982],
    img: spotImage.nintendoTokyo,
    links: {
      youtube: yt("Nintendo Tokyo store"),
      maps: gmaps("Nintendo TOKYO PARCO"),
    },
  },
  goldenGai: {
    title: "Shinjuku Golden Gai",
    coords: [35.6931, 139.704],
    img: spotImage.goldenGai,
    links: {
      youtube: yt("Shinjuku Golden Gai"),
      maps: gmaps("Shinjuku Golden Gai"),
    },
  },
  tokyoSkytree: {
    title: "Tokyo Skytree",
    coords: [35.71, 139.8107],
    img: spotImage.tokyoSkytree,
    links: { youtube: yt("Tokyo Skytree"), maps: gmaps("Tokyo Skytree") },
  },
  salsaElCafeLatino: {
    title: "El Cafe Latino – Salsa (Azabu)",
    coords: [35.6559, 139.7367],
    img: spotImage.salsaElCafeLatino,
    links: {
      youtube: yt("El Cafe Latino Tokyo"),
      maps: gmaps("El Cafe Latino Tokyo"),
    },
  },
  shibaCafe: {
    title: "Mame-Shiba Inu Café (Harajuku)",
    coords: [35.6709, 139.7055],
    img: spotImage.shibaCafe,
    links: {
      youtube: yt("Shiba Inu cafe Harajuku"),
      maps: gmaps("Mameshiba Cafe Harajuku"),
    },
  },
  megaTokyo: {
    title: "Pokémon Center MEGA TOKYO (Ikebukuro)",
    coords: [35.7289, 139.7176],
    img: spotImage.megaTokyo,
    links: {
      youtube: yt("Pokemon Center Mega Tokyo"),
      maps: gmaps("Pokemon Center Mega Tokyo"),
    },
  },
  fushimiInari: {
    title: "Fushimi Inari Taisha",
    coords: [34.9671, 135.7727],
    img: spotImage.fushimiInari,
    links: {
      youtube: yt("Fushimi Inari"),
      maps: gmaps("Fushimi Inari Taisha"),
    },
  },
  samuraiMuseum: {
    title: "Kyoto Samurai & Ninja Museum",
    coords: [35.0046, 135.7679],
    img: spotImage.samuraiMuseum,
    links: {
      youtube: yt("Kyoto Samurai and Ninja Museum"),
      maps: gmaps("Kyoto Samurai & Ninja Museum"),
    },
  },
  kiyomizudera: {
    title: "Kiyomizu-dera",
    coords: [34.9949, 135.785],
    img: spotImage.kiyomizudera,
    links: { youtube: yt("Kiyomizudera"), maps: gmaps("Kiyomizu-dera") },
  },
  dotonbori: {
    title: "Dotonbori (Osaka)",
    coords: [34.6687, 135.501],
    img: spotImage.dotonbori,
    links: { youtube: yt("Dotonbori"), maps: gmaps("Dotonbori") },
  },
  umedaSky: {
    title: "Umeda Sky Building",
    coords: [34.7055, 135.49],
    img: spotImage.umedaSky,
    links: {
      youtube: yt("Umeda Sky Building"),
      maps: gmaps("Umeda Sky Building"),
    },
  },
  ghibliPark: {
    title: "Ghibli Park (Nagakute, Aichi)",
    coords: [35.1693, 137.0566],
    img: spotImage.ghibliPark,
    links: { youtube: yt("Ghibli Park"), maps: gmaps("Ghibli Park Aichi") },
  },
  nagoyaCastle: {
    title: "Nagoya Castle",
    coords: [35.185, 136.8997],
    img: spotImage.nagoyaCastle,
    links: { youtube: yt("Nagoya Castle"), maps: gmaps("Nagoya Castle") },
  },
  osu: {
    title: "Osu Shopping Street (Nagoya)",
    coords: [35.159, 136.9066],
    img: spotImage.osu,
    links: {
      youtube: yt("Osu Shopping Street"),
      maps: gmaps("Osu Shopping Street"),
    },
  },
  tokyoTower: {
    title: "Tokyo Tower",
    coords: [35.6586, 139.7454],
    img: spotImage.tokyoTower,
    links: { youtube: yt("Tokyo Tower"), maps: gmaps("Tokyo Tower") },
  },

  teamLab: {
    title: "teamLab Planets TOKYO",
    coords: [35.64571, 139.7844],
    links: {
      youtube: yt("teamLab Planets Tokyo"),
      maps: gmaps("teamLab Planets Tokyo"),
    },
  },
  pokemonCafe: {
    title: "Pokémon Café (Nihonbashi)",
    coords: [35.68235, 139.77352],
    links: {
      youtube: yt("Pokemon Cafe Tokyo"),
      maps: gmaps("Pokemon Cafe Nihonbashi"),
    },
  },
  kirbyCafe: {
    title: "Kirby Café (Tokyo Skytree Town)",
    coords: [35.71006, 139.8107],
    links: {
      youtube: yt("Kirby Cafe Tokyo"),
      maps: gmaps("Kirby Cafe Tokyo Skytree"),
    },
  },
  jumpShop: {
    title: "JUMP SHOP (Tokyo)",
    coords: [35.65909, 139.70062],
    links: { youtube: yt("Jump Shop Tokyo"), maps: gmaps("Jump Shop Shibuya") },
  },
  pokemonShibuya: {
    title: "Pokémon Center Shibuya",
    coords: [35.66165, 139.69855],
    links: {
      youtube: yt("Pokemon Center Shibuya"),
      maps: gmaps("Pokemon Center Shibuya"),
    },
  },
  nintendoShibuya: {
    title: "Nintendo TOKYO (Shibuya PARCO)",
    coords: [35.66289, 139.698],
    links: {
      youtube: yt("Nintendo Tokyo store Shibuya"),
      maps: gmaps("Nintendo TOKYO PARCO"),
    },
  },
  jumpShopShibuya: {
    title: "JUMP SHOP Shibuya",
    coords: [35.66194, 139.6988],
    links: {
      youtube: yt("Jump Shop Shibuya"),
      maps: gmaps("Jump Shop Shibuya"),
    },
  },
  harajuku: {
    title: "Harajuku (Takeshita Street)",
    coords: [35.6717, 139.7038],
    links: {
      youtube: yt("Harajuku Takeshita Street"),
      maps: gmaps("Takeshita Street"),
    },
  },
  tokyoMega: {
    title: "Tokyo Mega Pokémon Card Store (Ikebukuro)",
    coords: [35.72894, 139.71106],
    links: {
      youtube: yt("Pokemon Card Mega Tokyo"),
      maps: gmaps("Pokemon Card Mega Tokyo"),
    },
  },
  photoshoot: {
    title: "Shibuya Photoshoot Spot",
    coords: [35.6598, 139.7005],
    links: { youtube: undefined, maps: gmaps("Shibuya Crossing") },
  },
  tokyoStation: {
    title: "Tokyo Station",
    coords: [35.68124, 139.76712],
    links: { youtube: yt("Tokyo Station"), maps: gmaps("Tokyo Station") },
  },
  kyotoStation: {
    title: "Kyoto Station",
    coords: [34.9858, 135.7585],
    links: { youtube: yt("Kyoto Station"), maps: gmaps("Kyoto Station") },
  },
  ninenzaka: {
    title: "Ninenzaka",
    coords: [34.99602, 135.77761],
    links: { youtube: yt("Ninenzaka Kyoto"), maps: gmaps("Ninenzaka") },
  },
  otagi: {
    title: "Otagi Nembutsu-ji",
    coords: [35.03537, 135.65188],
    links: {
      youtube: yt("Otagi Nembutsu-ji"),
      maps: gmaps("Otagi Nembutsu-ji"),
    },
  },
  nishiki: {
    title: "Nishiki Market",
    coords: [35.0054, 135.76498],
    links: {
      youtube: yt("Nishiki Market Kyoto"),
      maps: gmaps("Nishiki Market"),
    },
  },
  samurai: {
    title: "Samurai Experience (Kyoto)",
    coords: [35.0109, 135.7595],
    links: {
      youtube: yt("Kyoto Samurai experience"),
      maps: gmaps("Samurai Experience Kyoto"),
    },
  },
  narutoPark: {
    title: "Naruto Theme Park (Awaji Island)",
    coords: [34.30486, 134.84809],
    links: {
      youtube: yt("Naruto Theme Park"),
      maps: gmaps("Nijigen no Mori Naruto"),
    },
  },
  osakaDowntown: {
    title: "Dotonbori / Osaka Downtown",
    coords: [34.6687, 135.5012],
    links: { youtube: yt("Dotonbori"), maps: gmaps("Dotonbori Osaka") },
  },
  katsuoji: {
    title: "Katsuo-ji Temple",
    coords: [34.88965, 135.51578],
    links: { youtube: yt("Katsuo-ji Temple"), maps: gmaps("Katsuo-ji") },
  },
  hotelMitsuiSpa: {
    title: "HOTEL THE MITSUI KYOTO Spa",
    coords: [35.01654, 135.74746],
    links: {
      youtube: yt("Hotel the Mitsui Kyoto Spa"),
      maps: gmaps("HOTEL THE MITSUI KYOTO Spa"),
    },
  },
  pokemonOsaka: {
    title: "Pokémon Center Osaka",
    coords: [34.70249, 135.49595],
    links: {
      youtube: yt("Pokemon Center Osaka"),
      maps: gmaps("Pokemon Center Osaka"),
    },
  },
  kyotoLastShrine: {
    title: "Kyoto Shrine (TBD)",
    coords: [35.0116, 135.7681],
    links: { youtube: undefined, maps: gmaps("Kyoto Shrine") },
  },
  shinkansenBack: {
    title: "Shinkansen to Tokyo",
    coords: [35.503, 138.752],
    links: { youtube: undefined, maps: gmaps("Shinkansen Tokyo") },
  },
  lastShopping: {
    title: "Last-minute Shopping",
    coords: [35.6629, 139.7006],
    links: { youtube: undefined, maps: gmaps("Shibuya Shopping") },
  },
  airport: {
    title: "Tokyo Airport (Haneda/Narita)",
    coords: [35.5494, 139.7798],
    links: { youtube: yt("Haneda Airport"), maps: gmaps("Haneda Airport") },
  },
};
