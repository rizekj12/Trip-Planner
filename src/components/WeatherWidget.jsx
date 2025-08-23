import React from 'react';
import { useEffect, useMemo, useState } from "react";
import { CITIES } from "../utils/cities";

// Minimal mapping for Open‑Meteo weather codes → emoji/icon
const WMO = {
    0: "☀️", 1: "🌤️", 2: "⛅", 3: "☁️",
    45: "🌫️", 48: "🌫️",
    51: "🌦️", 53: "🌦️", 55: "🌦️",
    61: "🌧️", 63: "🌧️", 65: "🌧️",
    71: "🌨️", 73: "🌨️", 75: "🌨️",
    80: "🌦️", 81: "🌦️", 82: "🌧️",
    95: "⛈️", 96: "⛈️", 99: "⛈️",
};

function dayLabel(dateStr) {
    const d = new Date(dateStr);
    return d.toLocaleDateString(undefined, { weekday: "short" });
}

export default function WeatherWidget({ defaultCity = "tokyo", themeKey = "tokyo" }) {
    const [cityKey, setCityKey] = useState(defaultCity);
    const [data, setData] = useState(null);
    const [err, setErr] = useState("");

    const city = CITIES[cityKey];

    useEffect(() => {
        let abort = false;
        async function run() {
            try {
                setErr("");
                setData(null);
                const url = new URL("https://api.open-meteo.com/v1/forecast");
                url.searchParams.set("latitude", city.lat);
                url.searchParams.set("longitude", city.lon);
                url.searchParams.set("current_weather", "true");
                url.searchParams.set("daily", "weathercode,temperature_2m_max,temperature_2m_min,precipitation_probability_max");
                url.searchParams.set("timezone", "auto");

                const res = await fetch(url.toString(), { cache: "no-cache" });
                if (!res.ok) throw new Error("Weather fetch failed");
                const json = await res.json();
                if (!abort) setData(json);
            } catch (e) {
                if (!abort) setErr(e.message || "Failed to load weather");
            }
        }
        run();
        return () => { abort = true; };
    }, [city.lat, city.lon]);

    const daily = useMemo(() => {
        if (!data?.daily) return [];
        const t = data.daily;
        return t.time.map((date, i) => ({
            date,
            code: t.weathercode?.[i],
            tmax: Math.round(t.temperature_2m_max?.[i]),
            tmin: Math.round(t.temperature_2m_min?.[i]),
            pop: t.precipitation_probability_max?.[i] ?? null,
        }));
    }, [data]);

    const themeStyles =
        themeKey === "kansai"
            ? "bg-red-100/90 ring-red-300"
            : "bg-purple-100/90 ring-purple-300";



    return (
        <div className={`mx-4 md:mx-8 mt-4 mb-4 rounded-2xl px-3 py-2 text-zinc-900 shadow-lg backdrop-blur ${themeStyles}`}>
            <div className="flex items-center gap-2">
                <select
                    value={cityKey}
                    onChange={(e) => setCityKey(e.target.value)}
                    className="rounded-md bg-white/90 px-2 py-1 text-sm"
                >
                    {Object.entries(CITIES).map(([k, c]) => (
                        <option key={k} value={k}>{c.name}</option>
                    ))}
                </select>

                {err && <span className="text-xs text-rose-600">Error: {err}</span>}
                {!data && !err && (
                    <span className="ml-1 text-xs opacity-70">Loading…</span>
                )}

                {data?.current_weather && (
                    <div className="ml-auto flex items-center gap-2">
                        <span className="text-lg leading-none">
                            {WMO[data.current_weather.weathercode] ?? "🌡️"}
                        </span>
                        <span className="text-sm font-medium">
                            {Math.round(data.current_weather.temperature)}°
                            {data?.hourly_units?.temperature_2m ?? "C"}
                        </span>
                    </div>
                )}
            </div>

            {/* 7-day forecast */}
            {daily.length > 0 && (
                <div className="mt-2 grid grid-cols-7 gap-1">
                    {daily.slice(0, 7).map((d) => (
                        <div
                            key={d.date}
                            className={`rounded-lg p-1 text-center ${themeKey === "kansai"
                                ? "bg-red-200/70"
                                : "bg-purple-200/70"
                                }`}
                        >
                            <div className="text-[10px] font-medium opacity-70">
                                {dayLabel(d.date)}
                            </div>
                            <div className="text-base">{WMO[d.code] ?? "•"}</div>
                            <div className="text-[11px] font-semibold">
                                {d.tmax}°/<span className="opacity-70">{d.tmin}°</span>
                            </div>
                            {d.pop != null && (
                                <div className="text-[10px] opacity-70">{d.pop}%</div>
                            )}
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
