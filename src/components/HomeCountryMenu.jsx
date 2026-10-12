import React, { useMemo, useRef, useState } from "react";
import { ChevronDown, Check, Search, Loader2 } from "lucide-react";
import CountryFlag from "./CountryFlag";
import { supabase } from "../utils/supabase";
import { useAuth } from "../context/AuthContext";
import { useClickOutside } from "../hooks/useClickOutside";
import { COUNTRIES } from "../data/countriesAndCities";
import { searchDestinations, guessHomeCountry } from "../utils/destinationSearch";

// "Based in" country picker for the header, like Expedia's site setting. Saved on the
// user's profile (user_metadata.home_country) for future promotions and points; until
// they choose, we show a guess from the browser's region without saving it.
// fullWidth: a form-field version (profile page) instead of the compact header button.
export default function HomeCountryMenu({ fullWidth = false }) {
  const { user } = useAuth();
  const saved = user?.user_metadata?.home_country || null;
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [saving, setSaving] = useState(null); // country being saved
  const [error, setError] = useState("");
  const inputRef = useRef(null);
  const ref = useClickOutside(() => setOpen(false));

  const guess = useMemo(() => guessHomeCountry(), []);
  const current = saving || saved || guess;
  const options = query.trim() ? searchDestinations(query, 30) : COUNTRIES;

  const toggle = () => {
    setOpen((o) => !o);
    setQuery("");
    setError("");
    // Focus the search box once the menu has rendered
    setTimeout(() => inputRef.current?.focus(), 0);
  };

  const choose = async (country) => {
    setOpen(false);
    if (country === saved) return;
    setSaving(country);
    // Fires USER_UPDATED, so the auth context (and this button) pick up the new value
    const { error } = await supabase.auth.updateUser({ data: { home_country: country } });
    setSaving(null);
    if (error) {
      setError("Couldn't save your country. Please try again.");
      setOpen(true);
    }
  };

  return (
    <div ref={ref} className="relative">
      <button
        onClick={toggle}
        aria-haspopup="listbox"
        aria-expanded={open}
        title="Where you're based"
        className={`items-center gap-2 rounded-xl bg-white/15 px-3 text-sm font-medium text-white ring-1 ring-white/20 backdrop-blur transition hover:bg-white/25 ${
          fullWidth ? "flex w-full py-2.5 text-left" : "inline-flex py-2"
        }`}
      >
        {saving ? <Loader2 size={16} className="animate-spin" /> : current ? <CountryFlag name={current} /> : null}
        <span className={fullWidth ? "flex-1 truncate" : "hidden max-w-[9rem] truncate sm:inline"}>
          {current || "Your country"}
        </span>
        <ChevronDown size={14} className={`opacity-80 transition ${open ? "rotate-180" : ""}`} />
      </button>

      {open && (
        <div
          className={`absolute right-0 z-50 mt-2 overflow-hidden rounded-xl border border-gray-100 bg-white text-gray-900 shadow-2xl ${
            fullWidth ? "left-0" : "w-72 max-w-[calc(100vw-2rem)]"
          }`}
        >
          <div className="border-b border-gray-100 px-4 pb-3 pt-3">
            <p className="text-sm font-semibold">Where are you based?</p>
            <p className="mt-0.5 text-xs text-gray-500">Used to personalize offers and rewards.</p>
            <div className="relative mt-3">
              <Search size={15} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                ref={inputRef}
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && options[0]) choose(options[0]);
                  if (e.key === "Escape") setOpen(false);
                }}
                placeholder="Search countries"
                className="w-full rounded-lg border-2 border-gray-200 py-2 pl-9 pr-3 text-sm focus:border-indigo-500 focus:outline-none"
              />
            </div>
            {error && <p className="mt-2 text-xs text-red-600">{error}</p>}
          </div>

          <ul role="listbox" className="max-h-72 overflow-y-auto py-1">
            {options.length ? (
              options.map((country) => (
                <li key={country}>
                  <button
                    role="option"
                    aria-selected={country === current}
                    onClick={() => choose(country)}
                    className={`flex w-full items-center gap-3 px-4 py-2 text-left text-sm transition hover:bg-indigo-50 ${
                      country === current ? "font-semibold text-indigo-700" : "text-gray-800"
                    }`}
                  >
                    <span className="flex w-6 justify-center"><CountryFlag name={country} /></span>
                    <span className="flex-1 truncate">{country}</span>
                    {country === current && <Check size={15} />}
                  </button>
                </li>
              ))
            ) : (
              <li className="px-4 py-3 text-sm text-gray-500">No matching countries</li>
            )}
          </ul>
        </div>
      )}
    </div>
  );
}
