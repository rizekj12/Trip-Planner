import { hotels } from "./hotels";

export const days = [
  { key: "d1", date: "Thu Sep 25", title: "Arrival – Akihabara Night Walk", hotel: hotels.tokyoAki, markers: ["akihabara"], notes: ["Arrive ~7:30pm, check-in at NOHGA Akihabara.", "Stretch legs with a quick Akihabara stroll and snacks."] },
  { key: "d2", date: "Fri Sep 26", title: "Akihabara → Nihonbashi → Harajuku", hotel: hotels.tokyoAki, markers: ["pokemonDX", "imperialPalace", "nikeHarajuku", "jumpHarajuku", "goldenGai"], notes: ["Morning: Pokémon Center DX & optional Kirby Café.", "Imperial Palace walk, then Harajuku shopping (Nike & JUMP SHOP).", "Option: nightcap in Shinjuku Golden Gai."] },
  { key: "d3", date: "Sat Sep 27", title: "Shibuya Day + Salsa Night", hotel: hotels.tokyoAki, markers: ["shibuyaCrossing", "shibuyaSky", "nintendoTokyo", "salsaElCafeLatino"], notes: ["Shibuya Crossing, Shibuya SKY views, Nintendo TOKYO.", "One salsa night in Tokyo – El Cafe Latino (Azabu)."] },
  { key: "d4", date: "Sun Sep 28", title: "Meiji Shrine & Chill", hotel: hotels.tokyoAki, markers: ["meijiShrine", "shibaCafe", "tokyoSkytree"], notes: ["Morning at Meiji Shrine.", "Cute break at the Mame-Shiba Inu Café (Harajuku).", "Evening skyline: Tokyo Skytree (or relax)."] },
  { key: "d5", date: "Mon Sep 29", title: "To Kyoto + Fushimi Inari", hotel: hotels.kyoto, markers: ["fushimiInari"], notes: ["Shinkansen to Kyoto, check-in at Oriental Rokujo.", "Late afternoon: Fushimi Inari torii paths."] },
  { key: "d6", date: "Tue Sep 30", title: "Ghibli Park + Nagoya Sights", hotel: hotels.kyoto, markers: ["ghibliPark", "nagoyaCastle", "osu"], notes: ["Day trip to Aichi: Ghibli Park (tickets required).", "Add Nagoya Castle & Osu Shopping Street if time allows."] },
  { key: "d7", date: "Wed Oct 1", title: "Osaka Day Trip", hotel: hotels.kyoto, markers: ["dotonbori", "umedaSky"], notes: ["Kyoto → Osaka (JR Special Rapid or Shinkansen).", "Dotonbori food crawl + Umeda Sky sunset."] },
  { key: "d8", date: "Thu Oct 2", title: "Kyoto Culture", hotel: hotels.kyoto, markers: ["kiyomizudera", "samuraiMuseum"], notes: ["6am shrine vibes; Kiyomizu-dera temple views.", "Kyoto Samurai & Ninja Museum + Nishiki Market nearby."] },
  { key: "d9", date: "Fri Oct 3", title: "Back to Tokyo (Tamachi) + Tower", hotel: hotels.tokyoTamachi, markers: ["tokyoTower"], notes: ["Shinkansen to Tokyo, check-in at Shizutetsu Prezio Tokyo Tamachi.", "Evening: Tokyo Tower or Odaiba stroll."] },
  { key: "d10", date: "Sat Oct 4", title: "Last‑Day Tokyo + Flight", hotel: hotels.tokyoTamachi, markers: ["megaTokyo"], notes: ["Morning: Pokémon Center MEGA TOKYO (Ikebukuro).", "Evening flight from HND ~18:10 (leave city by mid‑afternoon)."] },
];
