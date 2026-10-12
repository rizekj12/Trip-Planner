import React from "react";

const COLORS = ["bg-indigo-500", "bg-pink-500", "bg-emerald-500", "bg-orange-500", "bg-cyan-600", "bg-violet-500"];
const colorFor = (name = "") => COLORS[[...name].reduce((sum, ch) => sum + ch.charCodeAt(0), 0) % COLORS.length];
const initials = (name = "") =>
  name.trim().split(/\s+/).slice(0, 2).map((w) => w[0]?.toUpperCase()).join("") || "?";

// Profile photo, or colored initials. size: Tailwind h/w classes; ring: border to separate stacked bubbles.
export default function CrewAvatar({ person, size = "h-9 w-9", textSize = "text-xs", ring = "" }) {
  return person.avatarUrl ? (
    <img src={person.avatarUrl} alt="" className={`${size} flex-none rounded-full object-cover ${ring}`} />
  ) : (
    <span
      className={`${size} ${textSize} ${colorFor(person.name)} ${ring} flex flex-none items-center justify-center rounded-full font-bold text-white`}
      aria-hidden="true"
    >
      {initials(person.name)}
    </span>
  );
}
