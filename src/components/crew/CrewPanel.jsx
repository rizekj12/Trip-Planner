import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { UserPlus, Loader2, X, LogOut } from "lucide-react";
import CrewAvatar from "./CrewAvatar";
import InviteModal from "./InviteModal";
import { useCrew, useRemoveCrewMember } from "../../hooks/useCrew";
import { theme } from "../../utils/theme";

const ROLE_LABEL = { owner: "Organizer", member: "Member", guest: "Guest" };
const ROLE_STYLE = {
  owner: "bg-violet-100 text-violet-800",
  member: "bg-emerald-100 text-emerald-800",
  guest: "bg-gray-100 text-gray-700",
};

// "Travel Crew" tab: everyone on the trip. The organizer can invite and remove people;
// a member can leave. `crew` passes the list in directly for a guest (read-only).
export default function CrewPanel({ tripId, destination, crew: given }) {
  const navigate = useNavigate();
  const fetched = useCrew(tripId, { enabled: !given });
  const crew = given ? { data: given, isLoading: false, isError: false } : fetched;
  const remove = useRemoveCrewMember(tripId);
  const [inviteOpen, setInviteOpen] = useState(false);
  const people = crew.data?.people || [];
  const isOwner = crew.data?.isOwner;
  const isGuest = !!given;

  const leave = (person) =>
    remove.mutate(person.id, { onSuccess: () => navigate("/") });

  return (
    <div className={`mx-auto max-w-2xl rounded-2xl p-6 shadow-xl ${theme.card}`}>
      <div className={`mb-5 flex flex-wrap items-center justify-between gap-3 rounded-xl p-4 ${theme.header}`}>
        <div>
          <h2 className="text-2xl font-semibold">Travel Crew</h2>
          <p className="mt-1 text-sm opacity-80">Who's coming on this trip</p>
        </div>
        {isOwner && (
          <button
            onClick={() => setInviteOpen(true)}
            className="inline-flex items-center gap-2 rounded-xl bg-violet-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-violet-700"
          >
            <UserPlus size={16} />
            Invite travel partner
          </button>
        )}
      </div>

      {crew.isLoading && (
        <div className="py-8 text-center text-gray-500">
          <Loader2 className="mx-auto animate-spin" />
        </div>
      )}
      {crew.isError && <p className="py-6 text-center text-sm text-red-600">{crew.error.message}</p>}

      <ul className="space-y-2">
        {people.map((p) => (
          <li key={p.id} className={`flex items-center gap-3 rounded-xl p-3 ${theme.sub}`}>
            <CrewAvatar person={p} size="h-11 w-11" textSize="text-sm" />
            <span className="min-w-0 flex-1">
              <span className="block truncate font-semibold text-gray-900">
                {p.name}{p.isYou && <span className="font-normal text-gray-500"> (you)</span>}
              </span>
              {p.email && <span className="block truncate text-xs text-gray-500">{p.email}</span>}
            </span>
            <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${ROLE_STYLE[p.role]}`}>{ROLE_LABEL[p.role]}</span>
            {isOwner && p.role !== "owner" && (
              <button
                onClick={() => remove.mutate(p.id)}
                disabled={remove.isPending}
                className="rounded-lg p-1.5 text-gray-400 hover:bg-red-50 hover:text-red-600"
                aria-label={`Remove ${p.name}`}
                title="Remove from trip"
              >
                <X size={16} />
              </button>
            )}
            {!isOwner && !isGuest && p.isYou && (
              <button
                onClick={() => leave(p)}
                disabled={remove.isPending}
                className="inline-flex items-center gap-1 rounded-lg px-2 py-1 text-xs font-semibold text-gray-500 hover:bg-red-50 hover:text-red-600"
              >
                <LogOut size={14} />
                Leave trip
              </button>
            )}
          </li>
        ))}
      </ul>

      {isOwner && people.length === 1 && (
        <p className="mt-4 rounded-xl border-2 border-dashed border-gray-200 px-4 py-5 text-center text-sm text-gray-600">
          Traveling with friends? Invite them to see the itinerary. Friends without an account can join as a guest.
        </p>
      )}
      {remove.isError && <p className="mt-3 text-sm text-red-600">{remove.error.message}</p>}

      {isOwner && (
        <InviteModal open={inviteOpen} onClose={() => setInviteOpen(false)} tripId={tripId} destination={destination} />
      )}
    </div>
  );
}
