import React, { useState } from "react";
import { Link } from "react-router-dom";
import { Bell, Loader2 } from "lucide-react";
import NotificationItem from "./NotificationItem";
import { useNotifications, useMarkNotificationsRead } from "../../hooks/useNotifications";
import { useClickOutside } from "../../hooks/useClickOutside";

const PREVIEW_COUNT = 5;

// Header bell: unread count, and a dropdown with the latest few notifications (join requests
// can be approved or denied right there) and a link to the full list
export default function NotificationBell() {
  const notifications = useNotifications();
  const markRead = useMarkNotificationsRead();
  const [open, setOpen] = useState(false);
  const ref = useClickOutside(() => setOpen(false));

  const all = notifications.data || [];
  const unread = all.filter((n) => !n.read_at);
  const preview = all.slice(0, PREVIEW_COUNT);

  // Opening the list counts as seeing it, except open join requests, which stay unread
  // (and highlighted) until they're answered
  const toggle = () => {
    const opening = !open;
    setOpen(opening);
    if (opening) {
      const seen = unread.filter((n) => n.type !== "join_request" || n.data?.resolution).map((n) => n.id);
      if (seen.length) markRead.mutate(seen);
    }
  };

  return (
    <div ref={ref} className="relative">
      <button
        onClick={toggle}
        className="relative flex h-10 w-10 items-center justify-center rounded-xl bg-white/10 ring-1 ring-white/20 transition hover:bg-white/20"
        aria-label={unread.length ? `Notifications, ${unread.length} unread` : "Notifications"}
        aria-expanded={open}
      >
        <Bell size={18} />
        {unread.length > 0 && (
          <span className="absolute -right-1.5 -top-1.5 flex h-5 min-w-5 items-center justify-center rounded-full bg-pink-600 px-1 text-[11px] font-bold leading-none ring-2 ring-[#0f2b5b]">
            {unread.length > 9 ? "9+" : unread.length}
          </span>
        )}
      </button>

      {open && (
        <div
          className="absolute right-0 z-50 mt-2 w-[22rem] overflow-hidden rounded-2xl border border-gray-100 bg-white text-gray-900 shadow-2xl"
          style={{ maxWidth: "calc(100vw - 1.5rem)" }}
        >
          <div className="flex items-center justify-between border-b border-gray-100 px-4 py-3">
            <h2 className="font-bold">Notifications</h2>
            {unread.length > 0 && (
              <button onClick={() => markRead.mutate()} className="text-xs font-semibold text-violet-700 hover:underline">
                Mark all read
              </button>
            )}
          </div>

          {notifications.isLoading ? (
            <div className="py-8 text-center text-gray-400">
              <Loader2 className="mx-auto animate-spin" size={20} />
            </div>
          ) : notifications.isError ? (
            <p className="px-4 py-6 text-center text-sm text-red-600">Couldn't load notifications.</p>
          ) : preview.length === 0 ? (
            <p className="px-4 py-8 text-center text-sm text-gray-500">
              You're all caught up. Join requests and trip updates will show up here.
            </p>
          ) : (
            <ul className="max-h-[60vh] divide-y divide-gray-100 overflow-y-auto">
              {preview.map((n) => (
                <NotificationItem key={n.id} notification={n} compact onOpen={() => setOpen(false)} />
              ))}
            </ul>
          )}

          <Link
            to="/notifications"
            onClick={() => setOpen(false)}
            className="block border-t border-gray-100 px-4 py-3 text-center text-sm font-semibold text-violet-700 hover:bg-violet-50"
          >
            View all notifications
          </Link>
        </div>
      )}
    </div>
  );
}
