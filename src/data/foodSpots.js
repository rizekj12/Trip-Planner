import { yt, gmaps } from "../utils/helpers";

export const foodSpots = [
  {
    title: "Naka‑Meguro Steak",
    region: "Tokyo",
    coords: [35.6446, 139.6985],
    img: "https://images.unsplash.com/photo-1600891963938-a7c11afc98f8?q=80&w=1200&auto=format&fit=crop",
    links: {
      youtube: yt("Nakameguro steak"),
      maps: gmaps("steak restaurant Nakameguro"),
    },
  },
  {
    title: "I'm donut ?",
    region: "Tokyo",
    coords: [35.6675, 139.7103],
    img: "https://images.unsplash.com/photo-1606313564200-e75d5e30476d?q=80&w=1200&auto=format&fit=crop",
    links: {
      youtube: yt("I'm donut Harajuku"),
      maps: gmaps("I'm donut Harajuku"),
    },
  },
  {
    title: "Ramen Hiro",
    region: "Tokyo",
    coords: [35.6938, 139.7034],
    img: "https://images.unsplash.com/photo-1543352634-8730c9c4c7f5?q=80&w=1200&auto=format&fit=crop",
    links: {
      youtube: yt("Ramen Hiro Shinjuku"),
      maps: gmaps("Ramen Hiro Shinjuku"),
    },
  },
  // Suggestions
  {
    title: "Ichiran Ramen (Shibuya)",
    region: "Tokyo",
    coords: [35.6591, 139.6985],
    img: "https://images.unsplash.com/photo-1544025162-d76694265947?q=80&w=1200&auto=format&fit=crop",
    links: {
      youtube: yt("Ichiran Shibuya"),
      maps: gmaps("Ichiran Ramen Shibuya"),
    },
  },
  {
    title: "Gyukatsu Motomura (Shinjuku)",
    region: "Tokyo",
    coords: [35.6937, 139.7032],
    img: "https://images.unsplash.com/photo-1617195737498-7f2f0de2a5af?q=80&w=1200&auto=format&fit=crop",
    links: {
      youtube: yt("Gyukatsu Motomura Shinjuku"),
      maps: gmaps("Gyukatsu Motomura Shinjuku"),
    },
  },
  {
    title: "AFURI Ramen (Harajuku)",
    region: "Tokyo",
    coords: [35.6695, 139.7062],
    img: "https://images.unsplash.com/photo-1557872943-16a5ac26437b?q=80&w=1200&auto=format&fit=crop",
    links: { youtube: yt("Afuri Harajuku"), maps: gmaps("AFURI Harajuku") },
  },
  {
    title: "Okonomiyaki Mizuno (Dotonbori)",
    region: "Osaka",
    coords: [34.6689, 135.5011],
    img: "https://images.unsplash.com/photo-1598965402089-897ce52e835f?q=80&w=1200&auto=format&fit=crop",
    links: {
      youtube: yt("Okonomiyaki Mizuno Osaka"),
      maps: gmaps("Mizuno Dotonbori"),
    },
  },
  {
    title: "Ippudo Ramen",
    region: "Kyoto",
    coords: [35.0031, 135.764],
    img: "https://images.unsplash.com/photo-1541782814453-c73df4a3e1f8?q=80&w=1200&auto=format&fit=crop",
    links: { youtube: yt("Ippudo Kyoto"), maps: gmaps("Ippudo Ramen Kyoto") },
  },
];
