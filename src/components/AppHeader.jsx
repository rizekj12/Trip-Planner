import React from "react";
import { Link } from "react-router-dom";
import { CalendarDays } from "lucide-react";
import Logo from "./Logo";
import HomeCountryMenu from "./HomeCountryMenu";
import ProfileMenu from "./ProfileMenu";
import NotificationBell from "./notifications/NotificationBell";

// Site header (white bar): TriptAi logo (links home) on the left; country setting,
// calendar, notifications and profile on the right. On phones the calendar and notifications live in the bottom tab bar.
export default function AppHeader() {
  return (
    <header className="relative z-20 glass-strong border-b border-white/60 text-slate-900 shadow-sm">
      <div className="mx-auto flex max-w-7xl items-center justify-between gap-3 px-4 py-3 sm:px-6">
        <Link to="/" className="flex min-w-0 items-center gap-2.5" aria-label="TriptAi home">
          <Logo markClassName="h-9 w-9" textClassName="text-xl sm:text-2xl" />
        </Link>

        <div className="flex flex-none items-center gap-2 sm:gap-3">
          <HomeCountryMenu />
          <Link
            to="/calendar"
            className="hidden items-center gap-2 rounded-xl px-3 py-2 text-sm font-medium bg-slate-100 text-slate-800 ring-1 ring-slate-200 transition hover:bg-slate-200 sm:inline-flex"
          >
            <CalendarDays size={16} />
            Calendar
          </Link>
          <div className="hidden sm:block">
            <NotificationBell />
          </div>
          <ProfileMenu />
        </div>
      </div>
    </header>
  );
}
