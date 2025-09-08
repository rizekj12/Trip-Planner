import React, { useEffect, useState } from "react";

// Coordinates for Tokyo (change to Kyoto if needed)
const LAT = 35.6895;
const LON = 139.6917;

const ICONS = {
  0: "☀️", // Clear
  1: "🌤️", // Mainly clear
  2: "⛅", // Partly cloudy
  3: "☁️", // Overcast
  45: "🌫️", // Fog
  48: "🌫️",
  51: "🌦️", // Drizzle
  53: "🌦️",
  55: "🌦️",
  61: "🌧️", // Rain
  63: "🌧️",
  65: "🌧️",
  80: "🌧️", // Showers
  81: "🌧️",
  82: "🌧️",
  71: "❄️", // Snow
  73: "❄️",
  75: "❄️",
  95: "⛈️", // Thunderstorm
  96: "⛈️",
  99: "⛈️",
};

function getIcon(code) {
  return ICONS[code] || "❓";
}

function getDesc(code) {
  // Simplified descriptions
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
  const [weather, setWeather] = useState(null);

  useEffect(() => {
    fetch(
      `https://api.open-meteo.com/v1/forecast?latitude=${LAT}&longitude=${LON}&daily=temperature_2m_max,temperature_2m_min,weathercode&forecast_days=4&timezone=auto`
    )
      .then((res) => res.json())
      .then((data) => {
        setWeather(data.daily);
      });
  }, []);

  if (!weather) {
    return (
      <section className="max-w-xl mx-auto mt-8">
        <h2 className="text-2xl font-bold mb-4">Weather Forecast</h2>
        <div className="bg-white/10 rounded-xl p-6 shadow-lg text-center">
          Loading...
        </div>
      </section>
    );
  }

  // Format days
  const days = weather.time.map((date, i) => {
    const d = new Date(date);
    let dayLabel;
    if (i === 0) dayLabel = "Today";
    else if (i === 1) dayLabel = "Tomorrow";
    else dayLabel = d.toLocaleDateString(undefined, { weekday: "short" });
    return {
      day: dayLabel,
      temp: `${weather.temperature_2m_max[i]}°C / ${weather.temperature_2m_min[i]}°C`,
      desc: getDesc(weather.weathercode[i]),
      icon: getIcon(weather.weathercode[i]),
    };
  });

  return (
    <section className="max-w-xl mx-auto mt-8">
      <h2 className="text-2xl font-bold mb-4 text-white">Weather Forecast</h2>
      <div className="bg-white/30 rounded-xl p-6 shadow-lg text-black">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {days.map((w) => (
            <div
              key={w.day}
              className="flex flex-col items-center bg-white/60 rounded-lg p-4 text-black"
            >
              <div className="text-3xl mb-2">{w.icon}</div>
              <div className="font-semibold">{w.day}</div>
              <div className="text-lg">{w.temp}</div>
              <div className="text-xs opacity-80">{w.desc}</div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
