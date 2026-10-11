import React, { useState } from "react";
import { motion } from "framer-motion";
import { Plane, Eye, EyeOff } from "lucide-react";
import SkyBackground from "../SkyBackground";

// Shared shell for the sign-in, sign-up and password screens: sky background,
// app name, and a frosted card for the form.
export default function AuthLayout({ children }) {
  return (
    <div className="relative flex min-h-screen flex-col items-center justify-center px-4 py-10 text-white">
      <SkyBackground />

      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="mb-6 flex flex-col items-center text-center"
      >
        <div className="mb-3 flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-pink-500 to-purple-600 shadow-xl">
          <Plane size={28} className="rotate-45 fill-white" />
        </div>
        <h1 className="text-3xl font-extrabold tracking-tight drop-shadow">Trip Planner</h1>
        <p className="mt-1 text-sm text-white/80 drop-shadow">AI-planned trips, ready when you land</p>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.1 }}
        className="w-full max-w-sm rounded-3xl bg-white/15 p-6 shadow-2xl ring-1 ring-white/25 backdrop-blur-md sm:p-8"
      >
        {children}
      </motion.div>
    </div>
  );
}

const inputClass =
  "w-full rounded-xl bg-white/90 py-3 pl-10 pr-3 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-400";

// Labelled input with a leading icon. type="password" gets a show/hide toggle.
export function AuthInput({ label, icon: Icon, type = "text", ...props }) {
  const [visible, setVisible] = useState(false);
  const isPassword = type === "password";

  return (
    <label className="block">
      <span className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-white/70">{label}</span>
      <span className="relative block">
        <Icon size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
        <input
          type={isPassword && visible ? "text" : type}
          className={`${inputClass} ${isPassword ? "pr-10" : ""}`}
          {...props}
        />
        {isPassword && (
          <button
            type="button"
            onClick={() => setVisible((v) => !v)}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
            aria-label={visible ? "Hide password" : "Show password"}
          >
            {visible ? <EyeOff size={16} /> : <Eye size={16} />}
          </button>
        )}
      </span>
    </label>
  );
}

// Error (red) or success (green) message inside the card
export function AuthMessage({ type = "error", children }) {
  if (!children) return null;
  return (
    <div
      className={`rounded-xl px-4 py-2.5 text-sm ${
        type === "success" ? "bg-green-500/30 text-green-50" : "bg-red-500/30 text-red-50"
      }`}
    >
      {children}
    </div>
  );
}

export function AuthButton({ busy, busyLabel, children }) {
  return (
    <button
      type="submit"
      disabled={busy}
      className="w-full rounded-xl bg-gradient-to-r from-pink-500 to-purple-600 py-3 text-sm font-semibold shadow-lg transition hover:shadow-xl disabled:opacity-60"
    >
      {busy ? busyLabel : children}
    </button>
  );
}
