import React from "react";
import { Plane } from "lucide-react";

// Scrapbook page behind the sign-in screens: dark indigo journal paper (so the frosted, white-
// text sign-in card stays readable) with travel polaroids, stamps, a postmark, a boarding pass
// stub and stickers around the edges. The middle is kept clear for the card. Decorative only.

// Fine paper grain
const GRAIN =
  "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='160' height='160'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='2' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)' opacity='0.5'/%3E%3C/svg%3E\")";

// Washi tape colors (brand palette)
const TAPE = {
  coral: "bg-coral-400/80",
  mango: "bg-mango-300/85",
  aqua: "bg-aqua-300/80",
  orchid: "bg-orchid-300/80",
  azure: "bg-azure-300/85",
};

function Polaroid({ src, caption, tape = "coral", className = "" }) {
  return (
    <figure className={`absolute bg-white p-2 pb-8 shadow-[0_12px_30px_rgba(0,0,0,0.45)] sm:p-2.5 sm:pb-10 ${className}`}>
      <span className={`absolute -top-3 left-1/2 h-6 w-16 -translate-x-1/2 -rotate-3 ${TAPE[tape]} sm:w-20`} />
      <img src={src} alt="" loading="lazy" className="aspect-square w-full object-cover" />
      <figcaption className="absolute inset-x-0 bottom-1 text-center font-hand text-lg leading-none text-slate-700 sm:bottom-1.5 sm:text-2xl">
        {caption}
      </figcaption>
    </figure>
  );
}

// Postage stamp with perforated edges
function Stamp({ className = "", color = "bg-coral-500", value = "45¢", label = "AIR MAIL" }) {
  const perforation = {
    WebkitMask: "radial-gradient(circle at 5px 5px, transparent 3.2px, #000 3.6px) -5px -5px / 10px 10px",
    mask: "radial-gradient(circle at 5px 5px, transparent 3.2px, #000 3.6px) -5px -5px / 10px 10px",
  };
  return (
    <div className={`absolute bg-[#fdf4e1] p-2.5 shadow-[0_8px_20px_rgba(0,0,0,0.4)] ${className}`} style={perforation}>
      <div className={`flex h-full w-full flex-col items-center justify-between ${color} px-2 py-2 text-white`}>
        <span className="self-end text-xs font-black">{value}</span>
        <Plane size={30} className="-rotate-12" fill="currentColor" />
        <span className="text-[9px] font-extrabold tracking-[0.2em]">{label}</span>
      </div>
    </div>
  );
}

// Round ink postmark with wavy cancellation lines
function Postmark({ className = "" }) {
  return (
    <svg viewBox="0 0 220 120" className={`absolute ${className}`} fill="none" stroke="currentColor">
      <defs>
        <path id="postmark-ring" d="M60 60 m-40 0 a40 40 0 1 1 80 0 a40 40 0 1 1 -80 0" />
      </defs>
      <circle cx="60" cy="60" r="50" strokeWidth="3" />
      <circle cx="60" cy="60" r="31" strokeWidth="2" />
      <text fill="currentColor" stroke="none" fontSize="12" fontWeight="800" letterSpacing="2.5">
        <textPath href="#postmark-ring">TRIPTAI · AIR MAIL · BON VOYAGE ·</textPath>
      </text>
      <text x="60" y="65" fill="currentColor" stroke="none" fontSize="15" fontWeight="900" textAnchor="middle">
        2026
      </text>
      <g strokeWidth="3.5" strokeLinecap="round">
        <path d="M118 42 q12 -8 24 0 t24 0 t24 0 t24 0" />
        <path d="M118 60 q12 -8 24 0 t24 0 t24 0 t24 0" />
        <path d="M118 78 q12 -8 24 0 t24 0 t24 0 t24 0" />
      </g>
    </svg>
  );
}

function BoardingPass({ className = "" }) {
  return (
    <div className={`absolute flex overflow-hidden rounded-lg bg-[#fdf4e1] text-slate-800 shadow-[0_10px_24px_rgba(0,0,0,0.45)] ${className}`}>
      <div className="flex-1 px-4 py-3">
        <p className="text-[9px] font-extrabold tracking-[0.25em] text-brand-600">BOARDING PASS</p>
        <p className="mt-1 flex items-center gap-2 text-2xl font-black tracking-tight">
          LAX <Plane size={18} className="rotate-45 text-coral-500" fill="currentColor" /> NRT
        </p>
        <p className="mt-1 text-[10px] font-bold text-slate-500">GATE 42 · SEAT 12A · 09:40</p>
      </div>
      <div className="flex w-14 flex-col items-center justify-center border-l-2 border-dashed border-slate-300 bg-mango-300 text-[10px] font-black tracking-widest">
        <span className="rotate-90 whitespace-nowrap">TRIPTAI</span>
      </div>
    </div>
  );
}

// An emoji with a white die-cut border
function Sticker({ children, className = "" }) {
  return (
    <span
      className={`absolute select-none ${className}`}
      style={{ filter: "drop-shadow(2px 0 0 #fff) drop-shadow(-2px 0 0 #fff) drop-shadow(0 2px 0 #fff) drop-shadow(0 -2px 0 #fff) drop-shadow(0 6px 8px rgba(0,0,0,0.35))" }}
    >
      {children}
    </span>
  );
}

function Label({ children, className = "" }) {
  return (
    <span className={`absolute rounded-full border-[3px] border-white px-4 py-1.5 font-hand text-2xl font-bold leading-none text-white shadow-[0_8px_18px_rgba(0,0,0,0.35)] ${className}`}>
      {children}
    </span>
  );
}

export default function ScrapbookBackground() {
  return (
    <div aria-hidden="true" className="pointer-events-none fixed inset-0 -z-10 overflow-hidden bg-[#22144f]">
      {/* Paper: soft lighting, journal dots and grain */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(168,85,255,0.18),transparent_65%)]" />
      <div className="absolute inset-0 opacity-[0.12] [background-image:radial-gradient(#fff_1px,transparent_1.2px)] [background-size:26px_26px]" />
      <div className="absolute inset-0 opacity-[0.18] mix-blend-overlay" style={{ backgroundImage: GRAIN }} />

      {/* Dashed flight path across the top */}
      <svg viewBox="0 0 1200 300" preserveAspectRatio="none" className="absolute inset-x-0 top-[3%] hidden h-48 w-full text-white/30 md:block">
        <path d="M-20 240 C220 40 460 40 640 120 S1000 220 1220 40" fill="none" stroke="currentColor" strokeWidth="3" strokeDasharray="10 12" />
      </svg>

      {/* Polaroids: corners on phones, more around the edges on bigger screens */}
      <Polaroid src="/destinations/greece.jpg" caption="Greece ☀" tape="aqua" className="-left-6 -top-6 w-32 -rotate-[9deg] sm:left-[3%] sm:top-[5%] sm:w-48 lg:w-56" />
      <Polaroid src="/destinations/iceland.jpg" caption="Iceland" tape="mango" className="-right-6 -top-4 w-32 rotate-[8deg] sm:right-[4%] sm:top-[7%] sm:w-48 lg:w-52" />
      <Polaroid src="/destinations/japan.jpg" caption="Tokyo nights" tape="orchid" className="-bottom-8 -left-5 w-32 rotate-[6deg] sm:bottom-[6%] sm:left-[6%] sm:w-48 lg:w-56" />
      <Polaroid src="/destinations/mexico.jpg" caption="Mexico ✨" tape="coral" className="-bottom-6 -right-6 w-32 -rotate-[5deg] sm:bottom-[5%] sm:right-[7%] sm:w-48 lg:w-52" />
      <Polaroid src="/destinations/portugal.jpg" caption="Lisbon" tape="azure" className="left-[-2%] top-[40%] hidden w-44 rotate-[5deg] md:block lg:w-48" />
      <Polaroid src="/destinations/puerto-rico.jpg" caption="San Juan" tape="mango" className="right-[-1%] top-[42%] hidden w-44 -rotate-[7deg] md:block lg:w-48" />

      {/* Stamps and postmark */}
      <Stamp className="left-[19%] top-[28%] hidden h-28 w-24 rotate-[10deg] lg:block" color="bg-coral-500" />
      <Postmark className="left-[21%] top-[33%] hidden w-44 -rotate-[8deg] text-white/45 lg:block" />
      <Stamp className="bottom-[30%] right-[20%] hidden h-28 w-24 -rotate-[8deg] lg:block" color="bg-aqua-600" value="1.20" label="PAR AVION" />

      {/* Boarding pass stub */}
      <BoardingPass className="bottom-[22%] left-[17%] hidden w-64 -rotate-[4deg] xl:flex" />

      {/* Stickers */}
      <Sticker className="left-[40%] top-[3%] hidden rotate-[-12deg] text-5xl md:block">✈️</Sticker>
      <Sticker className="right-[21%] top-[26%] hidden rotate-[10deg] text-5xl lg:block">🌴</Sticker>
      <Sticker className="bottom-[16%] left-[30%] hidden rotate-[-8deg] text-4xl lg:block">📍</Sticker>
      <Sticker className="bottom-[4%] right-[33%] hidden rotate-[14deg] text-5xl md:block">☀️</Sticker>
      <Sticker className="right-[26%] top-[60%] hidden -rotate-6 text-4xl xl:block">🗺️</Sticker>
      <Label className="left-[24%] top-[13%] hidden -rotate-[8deg] bg-coral-500 lg:block">Bon voyage!</Label>
      <Label className="bottom-[13%] right-[20%] hidden rotate-[5deg] bg-mango-400 text-slate-900 lg:block">Wish you were here</Label>
    </div>
  );
}
