import React from "react";
import { NavLink, Link } from "react-router-dom";
import { Home, CalendarDays, User, Plus } from "lucide-react";

const tabClass = ({ isActive }) =>
  `flex min-h-[44px] flex-col items-center justify-center gap-0.5 text-[11px] ${
    isActive ? "font-extrabold text-[#0f2b5b]" : "font-semibold text-slate-500"
  }`;

// Phone-only navigation: Trips · Calendar · + New · Profile. Pages that show it leave
// room at the bottom (pb-24 on small screens) so it never covers content.
export default function BottomTabBar() {
  return (
    <nav
      aria-label="Main"
      className="fixed inset-x-0 bottom-0 z-30 grid grid-cols-4 border-t border-slate-200 bg-white px-1.5 pb-[max(0.75rem,env(safe-area-inset-bottom))] pt-2 shadow-[0_-6px_20px_rgba(15,23,42,0.06)] sm:hidden"
    >
      <NavLink to="/" end className={tabClass}>
        <Home size={22} />
        Trips
      </NavLink>
      <NavLink to="/calendar" className={tabClass}>
        <CalendarDays size={22} />
        Calendar
      </NavLink>
      <Link to="/new" className="flex min-h-[44px] flex-col items-center justify-center gap-0.5 text-[11px] font-semibold text-slate-500">
        <span className="flex h-8 w-8 items-center justify-center rounded-full bg-pink-600 text-white">
          <Plus size={20} />
        </span>
        New
      </Link>
      <NavLink to="/profile" className={tabClass}>
        <User size={22} />
        Profile
      </NavLink>
    </nav>
  );
}
