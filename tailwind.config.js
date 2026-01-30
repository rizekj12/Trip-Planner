/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["/app/index.html", "/app/src/**/*.{js,jsx,ts,tsx}"],
  theme: {
    extend: {},
  },
  plugins: [],
  safelist: [
    "h-72",
    "w-full",
    "rounded-2xl",
    "shadow-xl",
    "ring-1",
    "ring-black/10",
  ],
};
