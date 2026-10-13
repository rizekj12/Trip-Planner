import React from "react";
import { Bell, Loader2 } from "lucide-react";
import SkyBackground from "../components/SkyBackground";
import AppHeader from "../components/AppHeader";
import BottomTabBar from "../components/BottomTabBar";
import NotificationItem from "../components/notifications/NotificationItem";
import { useNotifications, useMarkNotificationsRead } from "../hooks/useNotifications";

// Every notification (most recent 50), with Approve / Deny on open join requests
export default function NotificationsPage() {
  const notifications = useNotifications();
  const markRead = useMarkNotificationsRead();
  const all = notifications.data || [];
  const unreadCount = all.filter((n) => !n.read_at).length;
  const waiting = all.filter((n) => n.type === "join_request" && !n.data?.resolution).length;

  return (
    <div className="relative min-h-screen pb-24 text-white sm:pb-16">
      <SkyBackground />
      <AppHeader />

      <div className="mx-auto mt-6 max-w-2xl px-4 md:px-8">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h1 className="text-3xl font-extrabold tracking-tight drop-shadow md:text-4xl">Notifications</h1>
            {waiting > 0 && (
              <p className="mt-1 text-sm text-white/80">
                {waiting} join request{waiting === 1 ? "" : "s"} waiting for you
              </p>
            )}
          </div>
          {unreadCount > 0 && (
            <button
              onClick={() => markRead.mutate()}
              className="rounded-xl bg-white/10 px-3 py-2 text-sm font-medium ring-1 ring-white/20 transition hover:bg-white/20"
            >
              Mark all read
            </button>
          )}
        </div>

        <div className="mt-5 rounded-2xl bg-white p-2 text-gray-900 shadow-xl">
          {notifications.isLoading ? (
            <div className="py-12 text-center text-gray-400">
              <Loader2 className="mx-auto animate-spin" />
            </div>
          ) : notifications.isError ? (
            <p className="py-10 text-center text-sm text-red-600">Couldn't load notifications: {notifications.error.message}</p>
          ) : all.length === 0 ? (
            <div className="px-6 py-12 text-center text-gray-500">
              <Bell className="mx-auto mb-3 text-gray-300" size={36} />
              <p className="font-semibold text-gray-700">No notifications yet</p>
              <p className="mt-1 text-sm">When someone asks to join one of your trips, or an itinerary is ready, you'll see it here.</p>
            </div>
          ) : (
            <ul className="space-y-1">
              {all.map((n) => (
                <NotificationItem key={n.id} notification={n} />
              ))}
            </ul>
          )}
        </div>
      </div>
      <BottomTabBar />
    </div>
  );
}
