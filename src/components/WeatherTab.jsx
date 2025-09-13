import React, { useEffect, useState } from "react";

// city coords
const CITIES = {
  tokyo: { label: "Tokyo", lat: 35.6895, lon: 139.6917 },
  kyoto: { label: "Kyoto", lat: 35.0116, lon: 135.7681 },
  osaka: { label: "Osaka", lat: 34.6937, lon: 135.5023 },
};

const ICONS = {
  0: "☀️", 1: "🌤️", 2: "⛅", 3: "☁️",
  45: "🌫️", 48: "🌫️",
  51: "🌦️", 53: "🌦️", 55: "🌦️",
  61: "🌧️", 63: "🌧️", 65: "🌧️",
  71: "❄️", 73: "❄️", 75: "❄️",
  80: "🌧️", 81: "🌧️", 82: "🌧️",
  95: "⛈️", 96: "⛈️", 99: "⛈️",
};

function getIcon(code) { return ICONS[code] || "❓"; }
function getDesc(code) {
  if (code === 0) return "Clear";
  if (code === 1) return "Mainly Clear";
  if (code === 2) return "Partly Cloudy";
  if (code === 3) return "Overcast";
  if ([45, 48].includes(code)) return "Fog";
  if ([51, 53, 55].includes(code)) return "Drizzle";
  if ([61, 63, 65, 80, 81, 82].includes(code)) return "Rain";
  if ([71, 73, 75].includes(code)) return "Snow";
  if ([95, 96, 99].includes(code)) return "Thunderstorm";
  return "Unknown";
}

export default function WeatherTab() {
  const [cityKey, setCityKey] = useState("tokyo");
  const [weather, setWeather] = useState(null);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState(null);

  const city = CITIES[cityKey];

  useEffect(() => {
    let mounted = true;
    async function load() {
      setLoading(true);
      setErr(null);
      setWeather(null);
      try {
        const days = 7;
        const url = `https://api.open-meteo.com/v1/forecast?latitude=${city.lat}&longitude=${city.lon}&daily=temperature_2m_max,temperature_2m_min,weathercode&forecast_days=${days}&timezone=auto`;
        const res = await fetch(url);
        const json = await res.json();
        if (!mounted) return;
        if (!json || !json.daily || !json.daily.time) {
          setErr("No forecast available");
          setWeather(null);
        } else {
          setWeather(json.daily);
        }
      } catch (e) {
        if (!mounted) return;
        setErr("Network error");
        setWeather(null);
      } finally {
        if (mounted) setLoading(false);
      }
    }
    load();
    return () => { mounted = false; };
  }, [cityKey]);

  return (
    <section className="max-w-3xl mx-auto mt-6 px-4">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-2xl font-bold text-black">Weather — {city.label}</h2>
        <div className="flex gap-2">
          {Object.keys(CITIES).map((k) => (
            <button
              key={k}
              onClick={() => setCityKey(k)}
              className={`px-3 py-1 rounded-md text-sm ${k === cityKey ? "bg-indigo-600 text-white" : "bg-white/10 text-black"}`}
            >
              {CITIES[k].label}
            </button>
          ))}
        </div>
      </div>

      <div className="rounded-xl p-4 shadow-lg bg-white/30">
        {loading && <div className="p-6 text-center text-black">Loading...</div>}
        {err && <div className="p-6 text-center text-red-600">{err}</div>}

        {weather && (
          <div>
            {/* Today's summary */}
            <div className="mb-4">
              <div className="flex items-center gap-4">
                <div className="text-5xl">{getIcon(weather.weathercode[0])}</div>
                <div>
                  <div className="text-lg font-semibold text-black">Today</div>
                  <div className="text-sm text-black/80">{getDesc(weather.weathercode[0])}</div>
                </div>
                <div className="ml-auto text-black">
                  <div className="text-sm text-black/80">High / Low</div>
                  <div className="text-lg font-semibold">{weather.temperature_2m_max[0]}° / {weather.temperature_2m_min[0]}°</div>
                </div>
              </div>
            </div>

            {/* Week grid */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {weather.time.map((date, i) => {
                const d = new Date(date);
                const label = i === 0 ? "Today" : i === 1 ? "Tomorrow" : d.toLocaleDateString(undefined, { weekday: "short" });
                return (
                  <div key={date} className="flex flex-col items-center bg-white/60 rounded-md p-3 text-black">
                    <div className="text-sm font-medium">{label}</div>
                    <div className="text-2xl my-2">{getIcon(weather.weathercode[i])}</div>
                    <div className="text-sm">{weather.temperature_2m_max[i]}° / {weather.temperature_2m_min[i]}°</div>
                    <div className="text-xs opacity-80 mt-1">{getDesc(weather.weathercode[i])}</div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </section>
  );
}
