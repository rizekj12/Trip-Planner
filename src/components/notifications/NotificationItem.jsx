import React from "react";
import { Link } from "react-router-dom";
import { UserPlus, UserCheck, Sparkles, AlertTriangle, Bell, Check, X, Loader2 } from "lucide-react";
import { notificationText, notificationLink, timeAgo } from "../../utils/notifications";
import { useHomeCountry } from "../../utils/tripName";
import { useAnswerJoinRequest } from "../../hooks/useCrew";

const ICONS = {
  join_request: { Icon: UserPlus, style: "bg-violet-100 text-violet-700" },
  member_joined: { Icon: UserCheck, style: "bg-emerald-100 text-emerald-700" },
  join_approved: { Icon: UserCheck, style: "bg-emerald-100 text-emerald-700" },
  itinerary_ready: { Icon: Sparkles, style: "bg-pink-100 text-pink-700" },
  itinerary_failed: { Icon: AlertTriangle, style: "bg-amber-100 text-amber-700" },
};

// One notification: icon, text, time, and Approve / Deny on an open join request.
// `onOpen` runs when the text link is followed (e.g. to close the bell's dropdown).
export default function NotificationItem({ notification: n, onOpen, compact = false }) {
  const homeCountry = useHomeCountry();
  const answer = useAnswerJoinRequest();
  const { Icon, style } = ICONS[n.type] || { Icon: Bell, style: "bg-gray-100 text-gray-600" };
  const href = notificationLink(n);
  const openRequest = n.type === "join_request" && !n.data?.resolution;
  const unread = !n.read_at;

  const decide = (decision) =>
    answer.mutate({ tripId: n.trip_id, memberId: n.data.member_id, decision });

  const text = <span className={unread ? "font-semibold text-gray-900" : "text-gray-700"}>{notificationText(n, homeCountry)}</span>;

  return (
    <li className={`flex gap-3 ${compact ? "px-4 py-3" : "rounded-xl p-4"} ${unread ? "bg-violet-50/60" : ""}`}>
      <span className={`flex h-9 w-9 flex-none items-center justify-center rounded-full ${style}`}>
        <Icon size={17} />
      </span>
      <div className="min-w-0 flex-1 text-sm">
        {href ? (
          <Link to={href} onClick={onOpen} className="hover:underline">
            {text}
          </Link>
        ) : (
          text
        )}
        <div className="mt-0.5 flex items-center gap-2 text-xs text-gray-500">
          {timeAgo(n.created_at)}
          {n.data?.role === "guest" && n.type === "join_request" && <span>· as a guest</span>}
        </div>

        {openRequest && (
          <div className="mt-2 flex gap-2">
            <button
              onClick={() => decide("approve")}
              disabled={answer.isPending}
              className="inline-flex items-center gap-1 rounded-lg bg-violet-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-violet-700 disabled:opacity-50"
            >
              {answer.isPending && answer.variables?.decision === "approve" ? (
                <Loader2 size={13} className="animate-spin" />
              ) : (
                <Check size={13} />
              )}
              Approve
            </button>
            <button
              onClick={() => decide("deny")}
              disabled={answer.isPending}
              className="inline-flex items-center gap-1 rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-xs font-semibold text-gray-700 hover:border-red-200 hover:text-red-600 disabled:opacity-50"
            >
              {answer.isPending && answer.variables?.decision === "deny" ? (
                <Loader2 size={13} className="animate-spin" />
              ) : (
                <X size={13} />
              )}
              Deny
            </button>
          </div>
        )}
        {answer.isError && <p className="mt-1 text-xs text-red-600">{answer.error.message}</p>}
      </div>
      {unread && <span className="mt-1.5 h-2 w-2 flex-none rounded-full bg-violet-600" aria-label="Unread" />}
    </li>
  );
}
