import React from "react";
import { Link } from "react-router-dom";
import { Plane, CalendarDays } from "lucide-react";
import HomeCountryMenu from "./HomeCountryMenu";
import ProfileMenu from "./ProfileMenu";
import NotificationBell from "./notifications/NotificationBell";

// Site header (navy bar): logo + "Trip Planner" (links home) on the left; country setting,
// calendar, notifications and profile on the right. On phones the calendar lives in the bottom tab bar.
export default function AppHeader() {
  return (
    <header className="relative z-20 bg-[#0f2b5b] text-white shadow-md">
      <div className="mx-auto flex max-w-7xl items-center justify-between gap-3 px-4 py-3 sm:px-6">
        <Link to="/" className="flex min-w-0 items-center gap-2.5" aria-label="Trip Planner home">
          <span className="flex h-9 w-9 flex-none items-center justify-center rounded-xl bg-pink-600 shadow">
            <Plane size={18} className="rotate-45 fill-white text-white" />
          </span>
          <span className="truncate text-lg font-extrabold tracking-tight sm:text-xl">Trip Planner</span>
        </Link>

        <div className="flex flex-none items-center gap-2 sm:gap-3">
          <HomeCountryMenu />
          <Link
            to="/calendar"
            className="hidden items-center gap-2 rounded-xl bg-white/10 px-3 py-2 text-sm font-medium ring-1 ring-white/20 transition hover:bg-white/20 sm:inline-flex"
          >
            <CalendarDays size={16} />
            Calendar
          </Link>
          <NotificationBell />
          <ProfileMenu />
        </div>
      </div>
    </header>
  );
}
