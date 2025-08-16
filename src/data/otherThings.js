import { yt, gmaps } from "../utils/helpers";
import { spotImage } from "../imgData";

export const otherThings = [
  {
    title: "teamLab Planets (Toyosu)",
    region: "Tokyo",
    coords: [35.645, 139.7915],
    img: "https://images.unsplash.com/photo-1563089145-599997674d42?q=80&w=1200&auto=format&fit=crop",
    links: {
      youtube: yt("teamlab planets tokyo"),
      maps: gmaps("teamLab Planets TOKYO"),
    },
  },
  {
    title: "Kirby Café (Skytree Town)",
    region: "Tokyo",
    coords: [35.7102, 139.8107],
    img: "https://images.unsplash.com/photo-1571127236808-67e4e97b2a67?q=80&w=1200&auto=format&fit=crop",
    links: { youtube: yt("Kirby Cafe Tokyo"), maps: gmaps("Kirby Cafe Tokyo") },
  },
  {
    title: "Square Enix Café (Akihabara)",
    region: "Tokyo",
    coords: [35.6999, 139.7737],
    img: "https://images.unsplash.com/photo-1558980664-10eb5a52f4b2?q=80&w=1200&auto=format&fit=crop",
    links: {
      youtube: yt("Square Enix Cafe Akihabara"),
      maps: gmaps("Square Enix Cafe Akihabara"),
    },
  },
  {
    title: "Nishiki Market",
    region: "Kyoto",
    coords: [35.0056, 135.7649],
    img: "https://upload.wikimedia.org/wikipedia/commons/6/6b/Nishiki_Market.jpg",
    links: {
      youtube: yt("Nishiki Market Kyoto"),
      maps: gmaps("Nishiki Market"),
    },
  },
  {
    title: "Shinjuku Golden Gai",
    region: "Tokyo",
    coords: [35.6931, 139.704],
    img: spotImage.goldenGai,
    links: {
      youtube: yt("Shinjuku Golden Gai"),
      maps: gmaps("Shinjuku Golden Gai"),
    },
  },
];
