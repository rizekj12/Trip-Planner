import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { UserPlus, Loader2, X, LogOut, Check, Hourglass, BookmarkPlus, BookmarkCheck, Phone } from "lucide-react";
import CrewAvatar from "./CrewAvatar";
import InviteModal from "./InviteModal";
import { useCrew, useRemoveCrewMember, useAnswerJoinRequest } from "../../hooks/useCrew";
import { useSavedTravelers, useSaveCrewMember } from "../../hooks/useProfile";
import { theme } from "../../utils/theme";

const ROLE_LABEL = { owner: "Organizer", member: "Member", guest: "Guest" };
const ROLE_STYLE = {
  owner: "bg-violet-100 text-violet-800",
  member: "bg-emerald-100 text-emerald-800",
  guest: "bg-gray-100 text-gray-700",
};

// "Travel Crew" tab: everyone on the trip. The organizer can invite and remove people and
// answer join requests; a member can leave. `crew` passes the list in directly for a guest (read-only).
export default function CrewPanel({ tripId, destination, crew: given }) {
  const navigate = useNavigate();
  const fetched = useCrew(tripId, { enabled: !given });
  const crew = given ? { data: given, isLoading: false, isError: false } : fetched;
  const remove = useRemoveCrewMember(tripId);
  const answer = useAnswerJoinRequest();
  // The organizer can save people to their profile's saved travelers, to invite them again
  const savedTravelers = useSavedTravelers();
  const saveTraveler = useSaveCrewMember();
  const savedEmails = new Set((savedTravelers.data || []).map((t) => t.email).filter(Boolean));
  const [inviteOpen, setInviteOpen] = useState(false);
  const everyone = crew.data?.people || [];
  const people = everyone.filter((p) => p.status !== "pending");
  const pending = everyone.filter((p) => p.status === "pending");
  const maxTravelers = crew.data?.maxTravelers;
  const spotsLeft = maxTravelers ? Math.max(0, maxTravelers - (people.length - 1)) : null;
  const isOwner = crew.data?.isOwner;
  const isGuest = !!given;

  const leave = (person) =>
    remove.mutate(person.id, { onSuccess: () => navigate("/") });

  return (
    <div className={`mx-auto max-w-2xl rounded-2xl p-6 shadow-xl ${theme.card}`}>
      <div className={`mb-5 flex flex-wrap items-center justify-between gap-3 rounded-xl p-4 ${theme.header}`}>
        <div>
          <h2 className="text-2xl font-semibold">Travel Crew</h2>
          <p className="mt-1 text-sm opacity-80">
            Who's coming on this trip
            {isOwner && spotsLeft != null && ` · ${spotsLeft} spot${spotsLeft === 1 ? "" : "s"} left`}
          </p>
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

      {isOwner && pending.length > 0 && (
        <div className="mb-5 rounded-xl border-2 border-amber-200 bg-amber-50 p-3">
          <h3 className="mb-2 flex items-center gap-1.5 text-sm font-bold text-amber-900">
            <Hourglass size={15} />
            Waiting for your approval
          </h3>
          <ul className="space-y-2">
            {pending.map((p) => (
              <li key={p.id} className="flex flex-wrap items-center gap-3 rounded-lg bg-white p-3">
                <CrewAvatar person={p} size="h-10 w-10" textSize="text-sm" />
                <span className="min-w-0 flex-1">
                  <span className="block truncate font-semibold text-gray-900">{p.name}</span>
                  <span className="block truncate text-xs text-gray-500">
                    {p.email}
                    {p.role === "guest" && " · as a guest"}
                  </span>
                </span>
                <span className="flex gap-2">
                  <button
                    onClick={() => answer.mutate({ tripId, memberId: p.id, decision: "approve" })}
                    disabled={answer.isPending || spotsLeft === 0}
                    title={spotsLeft === 0 ? "The trip is full" : undefined}
                    className="inline-flex items-center gap-1 rounded-lg bg-violet-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-violet-700 disabled:opacity-50"
                  >
                    <Check size={13} />
                    Approve
                  </button>
                  <button
                    onClick={() => answer.mutate({ tripId, memberId: p.id, decision: "deny" })}
                    disabled={answer.isPending}
                    className="inline-flex items-center gap-1 rounded-lg border border-gray-200 px-3 py-1.5 text-xs font-semibold text-gray-700 hover:border-red-200 hover:text-red-600 disabled:opacity-50"
                  >
                    <X size={13} />
                    Deny
                  </button>
                </span>
              </li>
            ))}
          </ul>
          {answer.isError && <p className="mt-2 text-sm text-red-600">{answer.error.message}</p>}
        </div>
      )}

      <ul className="space-y-2">
        {people.map((p) => {
          const saved = p.email && savedEmails.has(p.email.toLowerCase());
          return (
            <li key={p.id} className={`rounded-xl p-3 ${theme.sub}`}>
              <div className="flex items-center gap-3">
                <CrewAvatar person={p} size="h-11 w-11" textSize="text-sm" />
                <span className="min-w-0 flex-1">
                  <span className="block truncate font-semibold text-gray-900">
                    {p.name}{p.isYou && <span className="font-normal text-gray-500"> (you)</span>}
                  </span>
                  {p.email && <span className="block truncate text-xs text-gray-500">{p.email}</span>}
                  {p.bio && <span className="mt-0.5 block text-xs italic text-gray-600">{p.bio}</span>}
                </span>
                <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${ROLE_STYLE[p.role]}`}>{ROLE_LABEL[p.role]}</span>
                {isOwner && p.role !== "owner" && p.email && !savedTravelers.isError && (
                  <button
                    onClick={() => !saved && saveTraveler.mutate({ tripId, memberId: p.id })}
                    disabled={saved || saveTraveler.isPending}
                    className={`rounded-lg p-1.5 ${saved ? "text-violet-600" : "text-gray-400 hover:bg-violet-50 hover:text-violet-700"}`}
                    aria-label={saved ? `${p.name} is in your saved travelers` : `Save ${p.name} to your travelers`}
                    title={saved ? "In your saved travelers" : "Save to my travelers"}
                  >
                    {saved ? <BookmarkCheck size={16} /> : <BookmarkPlus size={16} />}
                  </button>
                )}
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
              </div>
              {/* Shared by the member for this trip (organizer only, around the trip dates) */}
              {p.emergency && (
                <div className="ml-14 mt-2 flex flex-wrap items-center gap-x-2 gap-y-1 rounded-lg bg-rose-50 px-3 py-2 text-xs text-rose-900">
                  <Phone size={13} aria-hidden="true" />
                  <span className="font-semibold">Emergency contact:</span>
                  <span>
                    {[p.emergency.name, p.emergency.relationship && `(${p.emergency.relationship})`].filter(Boolean).join(" ")}
                  </span>
                  <a href={`tel:${p.emergency.phone}`} className="font-semibold underline">{p.emergency.phone}</a>
                  {p.emergency.email && <a href={`mailto:${p.emergency.email}`} className="underline">{p.emergency.email}</a>}
                </div>
              )}
            </li>
          );
        })}
      </ul>

      {isOwner && people.length === 1 && (
        <p className="mt-4 rounded-xl border-2 border-dashed border-gray-200 px-4 py-5 text-center text-sm text-gray-600">
          Traveling with friends? Invite them to see the itinerary. Friends without an account can join as a guest.
        </p>
      )}
      {remove.isError && <p className="mt-3 text-sm text-red-600">{remove.error.message}</p>}
      {saveTraveler.isError && <p className="mt-3 text-sm text-red-600">{saveTraveler.error.message}</p>}

      {isOwner && (
        <InviteModal open={inviteOpen} onClose={() => setInviteOpen(false)} tripId={tripId} destination={destination} />
      )}
    </div>
  );
}
