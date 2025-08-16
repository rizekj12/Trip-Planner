import React from 'react';
import { useEffect, useMemo, useState } from "react";

// Countdown to Sep 24, 2025 @ 9:00 AM New York time (EDT).
// Prefer local time instead? -> const TARGET = new Date("2025-09-24T09:00:00");
const TARGET = new Date("2025-09-24T09:00:00-04:00");

function formatDelta(ms) {
    if (ms <= 0) return { d: 0, h: 0, m: 0, s: 0 };
    const sec = Math.floor(ms / 1000);
    const d = Math.floor(sec / 86400);
    const h = Math.floor((sec % 86400) / 3600);
    const m = Math.floor((sec % 3600) / 60);
    const s = sec % 60;
    return { d, h, m, s };
}

export default function Countdown({ theme }) {
    const [now, setNow] = useState(() => Date.now());

    useEffect(() => {
        const id = setInterval(() => setNow(Date.now()), 1000);
        return () => clearInterval(id);
    }, []);

    const diff = TARGET.getTime() - now;

    // Hide entirely once the trip time/date has passed
    if (diff <= 0) return null;

    const remaining = useMemo(() => formatDelta(diff), [diff]);

    return (
        <div
            className="
        z-[9999]
        w-[calc(100%-2rem)] mx-4 mb-2         /* mobile: add bottom margin */
        rounded-lg backdrop-blur-md shadow-lg
        md:fixed md:right-4 md:top-4 md:w-auto md:mx-0 md:mb-0
      "
            style={{
                background: "rgba(255,255,255,0.18)",
                border: "1px solid rgba(255,255,255,0.25)",
            }}
            aria-live="polite"
        >
            <div className={`flex items-center gap-2 rounded-t-lg px-3 py-1.5 text-xs md:text-sm ${theme.header}`}>
                <span className="font-semibold">Countdown to Takeoff</span>
            </div>

            <div className="grid grid-flow-col items-center gap-3 px-3 py-2 text-white drop-shadow">
                <TimeBox label="days" value={remaining.d} />
                <Sep />
                <TimeBox label="hrs" value={remaining.h} />
                <Sep />
                <TimeBox label="mins" value={remaining.m} />
                <Sep />
                <TimeBox label="secs" value={remaining.s} />
            </div>
        </div>
    );
}

function TimeBox({ label, value }) {
    return (
        <div className="text-center leading-tight">
            <div className="text-xl md:text-2xl font-extrabold">{String(value).padStart(2, "0")}</div>
            <div className="text-[10px] uppercase tracking-wide opacity-90">{label}</div>
        </div>
    );
}

function Sep() {
    return <span className="opacity-70">:</span>;
}
