/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./index.html", "./src/**/*.{js,jsx,ts,tsx}"],
  theme: {
    extend: {
      // Rounded-terminal font for the whole site; system fonts while it loads
      fontFamily: {
        sans: ["Nunito", "ui-sans-serif", "system-ui", "-apple-system", "Segoe UI", "Roboto", "sans-serif"],
        // Handwriting (scrapbook captions on the sign-in screen)
        hand: ["Caveat", "Nunito", "cursive"],
      },
      colors: {
        // Site background
        cream: "#fdf4e1",
        // Brand palette. Primary: brand (#4f2cff), orchid (#a855ff), coral (#ff6b8a), mango (#ffb347).
        // Secondary: aqua (#00d4c6), azure (#67b5f7).
        brand: { 50: "#f3f0ff", 100: "#e6e1ff", 200: "#cec4ff", 300: "#af9fff", 400: "#8a72ff", 500: "#6546ff", 600: "#4f2cff", 700: "#4225d5", 800: "#361eae", 900: "#2c188c", 950: "#1e1160" },
        orchid: { 50: "#f8f1ff", 100: "#f1e4ff", 200: "#e3c9ff", 300: "#d2a7ff", 400: "#bd7eff", 500: "#a855ff", 600: "#934be0", 700: "#7c3fbc", 800: "#66339a", 900: "#532a7d", 950: "#391d57" },
        coral: { 50: "#fff3f6", 100: "#ffe7ec", 200: "#ffd0da", 300: "#ffb2c2", 400: "#ff8fa6", 500: "#ff6b8a", 600: "#e05e79", 700: "#bc4f66", 800: "#9a4054", 900: "#7d3444", 950: "#57242f" },
        mango: { 50: "#fff7ec", 100: "#ffefd8", 200: "#ffdfb2", 300: "#ffcb81", 400: "#ffb347", 500: "#d4953b", 600: "#ba8334", 700: "#9d6e2c", 800: "#825b24", 900: "#6b4b1e", 950: "#4c3515" },
        aqua: { 50: "#ebfcfa", 100: "#d6f8f6", 200: "#adf1ed", 300: "#7ae9e1", 400: "#3dded4", 500: "#00d4c6", 600: "#00baae", 700: "#009c92", 800: "#008078", 900: "#006861", 950: "#004844" },
        azure: { 50: "#f3f9fe", 100: "#e7f3fe", 200: "#cee7fc", 300: "#b0d9fb", 400: "#8bc7f9", 500: "#67b5f7", 600: "#5a9fd9", 700: "#4c85b6", 800: "#3e6d95", 900: "#335879", 950: "#233d54" },
      },
    },
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
