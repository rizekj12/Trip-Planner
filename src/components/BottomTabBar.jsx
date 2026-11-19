import React from "react";
import { NavLink, Link } from "react-router-dom";
import { User, Plus, CalendarDays, Bell } from "lucide-react";
import { useNotifications } from "../hooks/useNotifications";

// The TriptAi plane (from the logo), in the tab's current color
function TripsIcon({ size = 24 }) {
  return (
    <svg viewBox="0 0 128.99 148.95" width={size} height={size} aria-hidden="true" focusable="false">
      <path
        fill="currentColor"
        stroke="currentColor"
        strokeMiterlimit="10"
        d="M42.97,131.04l14.16,16.32c.42.48,1.16.96,1.69,1.06.83.17,1.22-.64,1.6-1.13l3.21-4.12c.66-.85,1.34-2.29.96-3.4-1.18-3.44-2.55-6.6-3.99-9.91l-5.26-12.03c-.23-.52.02-1.13.38-1.56,7.3-8.86,14.17-17.9,20.88-27.22,1-1.39,1.86-2.59,3.1-4l20.64,23.48,19.91,22.27c.42.47,1.32-.22,1.55-.57l3.77-5.62c1.1-1.65,2.12-3.33,2.74-5.23.43-1.32.08-2.86-.58-4.14l-12.74-24.8-7.32-14.74c-1.83-3.21-3.29-6.27-4.93-9.48l-4.04-7.95c-.27-.53-.45-1.02-.09-1.6l10.97-17.45,6.28-10.5c2.09-3.5,3.63-7.12,4.86-11.01,1.18-3.73,1.78-7.45,1.68-11.35-.03-1.3-.28-2.52-.9-3.64-1.73-3.12-5.52-2.42-8.28-1.24-2.87,1.24-5.33,2.93-7.69,4.99-7.61,6.65-13.17,14.25-18.87,22.54l-9.19,13.37c-.36.52-.86.72-1.5.66l-19.34-1.77-17.01-1.31-25.18-2.08c-3-.25-5.96-.78-8.22,2.32-1.93,2.65-3.77,5.23-5.48,8.02-.35.58-.37,1.87.4,2.15l28.65,10.43,27.61,10.01c.2.07.43.24.5.36.07.12.02.49-.06.62l-8.55,14.59c-3.77,6.43-7.27,12.82-10.52,19.5-.22.45-.79.81-1.27.81h-11.58c-4.18,0-8.2-.04-12.4.2-1.07.06-1.9,1.08-2.4,1.9l-1.85,3c-.57.92-2.36,3.41-.72,4.08,3.69,1.53,7.29,2.79,11.1,3.99l11.99,3.79"
      />
    </svg>
  );
}

const tabClass = ({ isActive }) =>
  `flex min-h-[44px] flex-col items-center justify-center gap-0.5 text-[11px] ${
    isActive ? "font-extrabold text-brand-700" : "font-semibold text-slate-500"
  }`;

// Phone-only navigation: Trips · Calendar · + New · Alerts · Profile, with New raised in the
// middle. Pages that show it leave room at the bottom (pb-24 on small screens) so it
// never covers content.
export default function BottomTabBar() {
  const notifications = useNotifications();
  const unread = (notifications.data || []).filter((n) => !n.read_at).length;
  return (
    <nav
      aria-label="Main"
      className="fixed inset-x-0 bottom-0 z-30 grid grid-cols-5 glass-strong border-t border-white/60 px-1.5 pb-[max(0.75rem,env(safe-area-inset-bottom))] pt-2 shadow-[0_-6px_20px_rgba(15,23,42,0.06)] sm:hidden"
    >
      <NavLink to="/" end className={tabClass}>
        <TripsIcon size={22} />
        Trips
      </NavLink>
      <NavLink to="/calendar" className={tabClass}>
        <CalendarDays size={22} />
        Calendar
      </NavLink>
      <Link to="/new" className="flex min-h-[44px] flex-col items-center justify-end gap-0.5 text-[11px] font-semibold text-slate-600">
        <span className="-mt-7 flex h-14 w-14 items-center justify-center rounded-full bg-coral-500 text-white shadow-lg ring-4 ring-cream transition hover:bg-coral-600">
          <Plus size={26} strokeWidth={2.5} />
        </span>
        New
      </Link>
      <NavLink to="/notifications" className={tabClass} aria-label={unread ? `Alerts, ${unread} unread` : "Alerts"}>
        <span className="relative">
          <Bell size={22} />
          {unread > 0 && (
            <span className="absolute -right-2 -top-1.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-coral-600 px-1 text-[10px] font-bold leading-none text-white ring-2 ring-white">
              {unread > 9 ? "9+" : unread}
            </span>
          )}
        </span>
        Alerts
      </NavLink>
      <NavLink to="/profile" className={tabClass}>
        <User size={22} />
        Profile
      </NavLink>
    </nav>
  );
}
