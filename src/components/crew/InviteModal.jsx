import React, { useEffect, useState } from "react";
import { Copy, Check, Share2, Mail, RefreshCw, Loader2, UserPlus, ShieldCheck } from "lucide-react";
import Modal from "../Modal";
import { useInviteLink, inviteUrl } from "../../hooks/useCrew";

// Invite a travel partner: one link per trip, shared by copy, the share sheet, or email.
// Friends with an account join as members; anyone else can join as a view-only guest.
// Links expire (30 days, or when the trip ends), and by default the organizer approves each
// new traveler before they can see the trip.
export default function InviteModal({ open, onClose, tripId, destination }) {
  const link = useInviteLink(tripId);
  const [copied, setCopied] = useState(false);
  const [email, setEmail] = useState("");
  const url = link.data?.token ? inviteUrl(link.data.token) : "";
  const settings = link.data;
  const spotsLeft = settings ? Math.max(0, settings.maxTravelers - settings.travelers) : null;
  const expires = settings?.expiresAt
    ? new Date(settings.expiresAt).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" })
    : null;

  // Fetch (or create) the link whenever the modal opens
  useEffect(() => {
    if (open && !link.data && !link.isPending) link.mutate({});
  }, [open]);

  const message = `Join me on my trip to ${destination || "somewhere fun"}! See the itinerary here: ${url}`;

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      // Clipboard blocked; the link is visible to copy by hand
    }
  };

  const share = () => navigator.share?.({ title: "Join my trip", text: message, url }).catch(() => {});

  const emailHref = `mailto:${encodeURIComponent(email.trim())}?subject=${encodeURIComponent(
    `Join my trip to ${destination || "…"}`
  )}&body=${encodeURIComponent(message)}`;

  return (
    <Modal open={open} onClose={onClose} className="max-w-md p-6">
      <div className="flex items-center gap-3">
        <span className="flex h-11 w-11 items-center justify-center rounded-full bg-violet-100 text-violet-700">
          <UserPlus size={22} />
        </span>
        <div>
          <h2 className="text-lg font-bold text-gray-900">Invite travel partner</h2>
          <p className="text-sm text-gray-600">
            {settings?.requireApproval === false
              ? "Anyone with this link can join and view the trip."
              : "Anyone with this link can ask to join. You approve each person."}
          </p>
        </div>
      </div>

      {link.isError && <p className="mt-4 text-sm text-red-600">{link.error.message}</p>}

      <div className="mt-5">
        <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-gray-500">Invite link</label>
        <div className="flex gap-2">
          <input
            readOnly
            value={url || "Creating link…"}
            onFocus={(e) => e.target.select()}
            className="min-w-0 flex-1 rounded-lg border-2 border-gray-200 px-3 py-2 text-sm text-gray-700"
          />
          <button
            onClick={copy}
            disabled={!url}
            className="inline-flex items-center gap-1.5 rounded-lg bg-violet-600 px-3 py-2 text-sm font-semibold text-white hover:bg-violet-700 disabled:opacity-50"
          >
            {copied ? <Check size={15} /> : <Copy size={15} />}
            {copied ? "Copied" : "Copy"}
          </button>
        </div>
        {settings && (
          <p className="mt-1 text-xs text-gray-500">
            {expires && `Works until ${expires}. `}
            {spotsLeft === 0
              ? "The trip is full."
              : `${spotsLeft} of ${settings.maxTravelers} spot${settings.maxTravelers === 1 ? "" : "s"} left.`}
          </p>
        )}
      </div>

      <label className="mt-4 flex cursor-pointer items-start gap-3 rounded-xl border-2 border-gray-100 p-3">
        <input
          type="checkbox"
          checked={settings?.requireApproval ?? true}
          disabled={!settings || link.isPending}
          onChange={(e) => link.mutate({ requireApproval: e.target.checked })}
          className="mt-0.5 h-4 w-4 accent-violet-600"
        />
        <span className="text-sm">
          <span className="flex items-center gap-1.5 font-semibold text-gray-900">
            <ShieldCheck size={15} className="text-violet-600" />
            Approve new travelers
          </span>
          <span className="block text-xs text-gray-500">
            You'll get a notification to approve or deny each person before they can see the trip.
          </span>
        </span>
      </label>

      <div className="mt-4">
        <label htmlFor="invite-email" className="mb-1 block text-xs font-semibold uppercase tracking-wide text-gray-500">
          Send by email
        </label>
        <div className="flex gap-2">
          <input
            id="invite-email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="friend@example.com"
            className="min-w-0 flex-1 rounded-lg border-2 border-gray-200 px-3 py-2 text-sm focus:border-violet-500 focus:outline-none"
          />
          <a
            href={url ? emailHref : undefined}
            aria-disabled={!url}
            className={`inline-flex items-center gap-1.5 rounded-lg border-2 border-gray-200 px-3 py-2 text-sm font-semibold text-gray-800 hover:border-violet-300 hover:text-violet-700 ${url ? "" : "pointer-events-none opacity-50"}`}
          >
            <Mail size={15} />
            Email
          </a>
        </div>
        <p className="mt-1 text-xs text-gray-500">Opens your email app with the invite written for you.</p>
      </div>

      <div className="mt-6 flex flex-wrap items-center justify-between gap-3 border-t border-gray-100 pt-4">
        <button
          onClick={() => link.mutate({ reset: true })}
          disabled={link.isPending}
          className="inline-flex items-center gap-1.5 text-sm font-medium text-gray-500 hover:text-red-600"
          title="Make a new link; the old one stops working"
        >
          {link.isPending ? <Loader2 size={14} className="animate-spin" /> : <RefreshCw size={14} />}
          Reset link
        </button>
        <div className="flex gap-2">
          {typeof navigator !== "undefined" && navigator.share && (
            <button
              onClick={share}
              disabled={!url}
              className="inline-flex items-center gap-1.5 rounded-lg border-2 border-gray-200 px-3 py-2 text-sm font-semibold text-gray-800 hover:border-violet-300 disabled:opacity-50"
            >
              <Share2 size={15} />
              Share
            </button>
          )}
          <button onClick={onClose} className="rounded-lg bg-gray-900 px-4 py-2 text-sm font-semibold text-white hover:bg-gray-800">
            Done
          </button>
        </div>
      </div>
    </Modal>
  );
}
