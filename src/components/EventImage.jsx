import React, { useState } from "react";
import { Utensils, Music, Trophy, Palette, Martini, PartyPopper, ShoppingBag, CalendarDays } from "lucide-react";

// Icon + gradient per event category, used when an event has no usable image
const CATEGORY_STYLES = {
  "Food & Drink": { icon: Utensils, gradient: "from-orange-400 to-rose-500" },
  "Music & Dance": { icon: Music, gradient: "from-fuchsia-500 to-purple-600" },
  "Sports & Recreation": { icon: Trophy, gradient: "from-emerald-400 to-teal-600" },
  "Arts & Culture": { icon: Palette, gradient: "from-sky-400 to-indigo-600" },
  "Nightlife": { icon: Martini, gradient: "from-violet-600 to-slate-900" },
  "Festival": { icon: PartyPopper, gradient: "from-pink-500 to-orange-400" },
  "Market": { icon: ShoppingBag, gradient: "from-amber-400 to-orange-600" },
};
const DEFAULT_STYLE = { icon: CalendarDays, gradient: "from-indigo-500 to-purple-600" };

// Placeholder services the AI used to fill in instead of real photos
const PLACEHOLDER_HOSTS = /(^|\.)(placeholder\.com|placehold\.co|placehold\.it|dummyimage\.com)$/i;

function isRealImage(url) {
  try {
    return !PLACEHOLDER_HOSTS.test(new URL(url).hostname);
  } catch {
    return false; // missing or not a URL
  }
}

// Event photo, or a category icon on a gradient when there's no real image (or it fails to load).
// size: "thumb" for list cards, "banner" for the modal header.
export default function EventImage({ event, size = "thumb" }) {
  const [broken, setBroken] = useState(false);

  if (isRealImage(event.image) && !broken) {
    return (
      <img
        src={event.image}
        alt={event.title}
        className="h-full w-full object-cover"
        onError={() => setBroken(true)}
      />
    );
  }

  const { icon: Icon, gradient } = CATEGORY_STYLES[event.category] || DEFAULT_STYLE;
  return (
    <div className={`flex h-full w-full items-center justify-center bg-gradient-to-br ${gradient} text-white`}>
      <Icon size={size === "banner" ? 64 : 30} strokeWidth={1.75} className="drop-shadow" />
    </div>
  );
}
