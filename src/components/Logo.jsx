import React from "react";

const PURPLE = "#96f";
const BLUE = "#67b5f7";

// TriptAi plane + sparkle mark, taken from TriptAiLogo.svg.
export function LogoMark({ className = "h-9 w-9" }) {
  return (
    <svg viewBox="-2 -1 154 164" className={className} aria-hidden="true" focusable="false">
      <path
        fill={PURPLE}
        stroke={PURPLE}
        strokeMiterlimit="10"
        d="M80.94,151.4l20.75,6.02c.61.18,1.49.18,1.99-.02.79-.31.68-1.2.74-1.82l.46-5.2c.09-1.07-.12-2.65-1.04-3.37-2.86-2.25-5.72-4.16-8.73-6.16l-10.95-7.25c-.47-.31-.59-.96-.53-1.51,1.33-11.4,2.18-22.73,2.76-34.19.09-1.71.16-3.19.43-5.04l30.08,8.52,28.81,7.9c.61.17.99-.91,1-1.32l.11-6.77c.03-1.98-.02-3.94-.54-5.88-.36-1.34-1.49-2.45-2.73-3.16l-24.16-13.91-14.15-8.41c-3.28-1.71-6.17-3.48-9.28-5.29l-7.71-4.48c-.51-.3-.93-.61-.94-1.3l-.25-20.61-.43-12.23c-.14-4.07-.82-7.95-1.89-11.88-1.03-3.77-2.55-7.22-4.75-10.44-.73-1.07-1.61-1.96-2.74-2.57-3.14-1.68-5.95.96-7.62,3.45-1.74,2.59-2.89,5.35-3.75,8.36-2.78,9.72-3.33,19.12-3.62,29.17l-.46,16.22c-.02.63-.33,1.07-.9,1.37l-17.2,9.01-15,8.14-22.28,11.92c-2.65,1.42-5.43,2.58-5.65,6.41-.18,3.28-.33,6.44-.25,9.71.02.67.7,1.77,1.5,1.59l29.72-6.79,28.62-6.58c.21-.05.5-.03.62.03s.28.4.29.55l.74,16.89c.32,7.44.85,14.71,1.75,22.09.06.5-.22,1.11-.62,1.37l-9.72,6.29c-3.51,2.27-6.91,4.42-10.31,6.89-.87.63-1.01,1.94-.98,2.89l.08,3.53c.02,1.08-.13,4.14,1.61,3.82,3.92-.72,7.64-1.62,11.48-2.67l12.12-3.33"
      />
      <path
        fill="#fff"
        stroke={PURPLE}
        strokeWidth="6"
        strokeMiterlimit="10"
        d="M47.77,35.92v-.44l.99-1.1,12.76-6c3.11-1.46,5.64-4.02,7.01-7.39l5.62-13.84c.15-.37.82-.99,1.18-1.04s1.1.53,1.29,1.01l5.42,13.4c1.43,3.54,3.83,6.27,7.13,7.82l12.72,5.97c.43.2.98,1.01.93,1.39s-.63,1.1-.96,1.26l-12.86,6.06c-2.91,1.37-5.39,3.97-6.67,7.11l-5.88,14.41c-.36.38-1.9.5-2.11-.04l-5.53-13.76c-1.43-3.57-3.91-6.15-7.19-7.71l-12.77-6.07-1.08-1.04h0Z"
      />
    </svg>
  );
}

// Full logo: mark + "TriptAi" wordmark. The wordmark is live text (the source SVG's
// text needs the Adobe Clean font, which most visitors won't have). `badgeClassName` (its
// size) puts the mark in a white circle, like the chat assistant's avatar.
export default function Logo({ markClassName = "h-9 w-9", textClassName = "text-xl", badgeClassName = "" }) {
  const mark = <LogoMark className={`flex-none ${markClassName}`} />;
  return (
    <span className={`inline-flex items-center ${badgeClassName ? "gap-3" : "gap-1.5"}`}>
      {badgeClassName ? (
        <span className={`glass-strong flex flex-none items-center justify-center rounded-full shadow-sm ${badgeClassName}`}>{mark}</span>
      ) : (
        mark
      )}
      <span className={`font-semibold leading-none tracking-tight ${textClassName}`}>
        <span style={{ color: PURPLE, letterSpacing: "-0.04em" }}>Tript</span>
        <span style={{ color: BLUE }}>Ai</span>
      </span>
    </span>
  );
}
