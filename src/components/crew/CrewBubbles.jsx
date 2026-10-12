import React, { useState } from "react";
import { UserPlus } from "lucide-react";
import Modal from "../Modal";
import CrewAvatar from "./CrewAvatar";
import InviteModal from "./InviteModal";
import { useCrew } from "../../hooks/useCrew";

const MAX_BUBBLES = 4;
const ROLE_LABEL = { owner: "Organizer", member: "Going", guest: "Guest" };

// "Invite travel partner" button plus overlapping avatar bubbles of who's going; the bubbles
// open a "Who's going" list. `tone` adapts it to a dark photo/sky background or a white card.
// `crew` passes the list in directly (a guest's page, which has no login to fetch it with).
export default function CrewBubbles({ tripId, destination, tone = "dark", crew: given }) {
  const fetched = useCrew(tripId, { enabled: !given });
  const [listOpen, setListOpen] = useState(false);
  const [inviteOpen, setInviteOpen] = useState(false);
  const data = given || fetched.data;
  const people = data?.people || [];
  const isOwner = data?.isOwner;
  if (!given && fetched.isError) return null; // e.g. Travel Crew not set up on the server yet

  const ring = tone === "dark" ? "ring-2 ring-white/80" : "ring-2 ring-white";
  const shown = people.slice(0, MAX_BUBBLES);
  const extra = people.length - shown.length;

  return (
    <div className="flex items-center gap-2">
      {isOwner && (
        <span className="group relative">
          <button
            onClick={() => setInviteOpen(true)}
            aria-label="Invite travel partner"
            className={`flex h-9 w-9 items-center justify-center rounded-full transition ${
              tone === "dark"
                ? "bg-white/15 text-white ring-1 ring-white/30 hover:bg-white/25"
                : "bg-violet-100 text-violet-700 hover:bg-violet-200"
            }`}
          >
            <UserPlus size={17} />
          </button>
          {/* Tooltip */}
          <span
            role="tooltip"
            className="pointer-events-none absolute left-1/2 top-full z-40 mt-2 -translate-x-1/2 whitespace-nowrap rounded-md bg-gray-900 px-2 py-1 text-xs font-medium text-white opacity-0 transition group-hover:opacity-100 group-focus-within:opacity-100"
          >
            Invite travel partner
          </span>
        </span>
      )}

      {people.length > 0 && (
        <button
          onClick={() => setListOpen(true)}
          className="flex items-center"
          aria-label={`Who's going: ${people.map((p) => p.name).join(", ")}`}
          title="Who's going"
        >
          {shown.map((p, i) => (
            <span key={p.id} className={i ? "-ml-2.5" : ""}>
              <CrewAvatar person={p} size="h-9 w-9" ring={ring} />
            </span>
          ))}
          {extra > 0 && (
            <span className={`-ml-2.5 flex h-9 w-9 items-center justify-center rounded-full bg-gray-800 text-xs font-bold text-white ${ring}`}>
              +{extra}
            </span>
          )}
        </button>
      )}

      <Modal open={listOpen} onClose={() => setListOpen(false)} className="max-w-sm p-5">
        <h2 className="text-lg font-bold text-gray-900">Who's going</h2>
        <ul className="mt-3 divide-y divide-gray-100">
          {people.map((p) => (
            <li key={p.id} className="flex items-center gap-3 py-2.5">
              <CrewAvatar person={p} size="h-10 w-10" textSize="text-sm" />
              <span className="min-w-0 flex-1">
                <span className="block truncate font-semibold text-gray-900">
                  {p.name}{p.isYou && <span className="font-normal text-gray-500"> (you)</span>}
                </span>
                {p.email && <span className="block truncate text-xs text-gray-500">{p.email}</span>}
              </span>
              <span className="rounded-full bg-gray-100 px-2 py-0.5 text-xs font-semibold text-gray-600">{ROLE_LABEL[p.role]}</span>
            </li>
          ))}
        </ul>
        {isOwner && (
          <button
            onClick={() => { setListOpen(false); setInviteOpen(true); }}
            className="mt-3 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-violet-600 py-2.5 text-sm font-semibold text-white hover:bg-violet-700"
          >
            <UserPlus size={16} />
            Invite travel partner
          </button>
        )}
      </Modal>

      {isOwner && (
        <InviteModal open={inviteOpen} onClose={() => setInviteOpen(false)} tripId={tripId} destination={destination} />
      )}
    </div>
  );
}
