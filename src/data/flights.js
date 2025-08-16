export const flights = [
  {
    dir: "To Japan",
    segments: [
      { airline: "Hawaiian Airlines", flight: "HA51", from: "JFK (New York)", to: "HNL (Honolulu)", dep: "Tue Sep 24, 09:05", arr: "13:45", duration: "10h40", terminal: "JFK T4 → HNL T1" },
      { airline: "Hawaiian Airlines", flight: "HA457", from: "HNL (Honolulu)", to: "HND (Tokyo Haneda)", dep: "Sep 24, 16:00", arr: "Sep 25, 19:25", duration: "8h25", terminal: "HND T3" },
    ],
  },
  {
    dir: "Return",
    segments: [
      { airline: "Air Canada", flight: "AC002", from: "HND (Tokyo Haneda)", to: "YYZ (Toronto)", dep: "Sat Oct 4, 18:10", arr: "17:35 (same day, local)", duration: "12h25", aircraft: "777-300ER" },
      { airline: "Air Canada Rouge", flight: "AC1676", from: "YYZ (Toronto)", to: "MCO (Orlando)", dep: "Oct 4, 20:55", arr: "23:48", duration: "2h53", aircraft: "A320-200" },
    ],
  },
];
