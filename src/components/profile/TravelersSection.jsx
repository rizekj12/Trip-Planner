import React, { useMemo, useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { Plus, Search, Plane, Pencil, Loader2, Copy, Check, Mail, CalendarDays } from "lucide-react";
import Modal from "../Modal";
import CrewAvatar from "../crew/CrewAvatar";
import CountryFlag from "../CountryFlag";
import { useAuth } from "../../context/AuthContext";
import { useSavedTravelers, useSaveTraveler, useDeleteTraveler, useSavedTravelerStatus } from "../../hooks/useProfile";
import { useTrips } from "../../hooks/useTrips";
import { inviteUrl } from "../../hooks/useCrew";
import { getInviteToken } from "../../utils/aiService";
import { RELATION_OPTIONS } from "../../utils/profile";
import { tripStatus } from "../../utils/trips";
import { tripRange, todayIso, formatRange } from "../../utils/calendar";
import { Field, SectionHeading, fieldClass, primaryButton, secondaryButton } from "./ProfileUI";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// "Saved travelers": people the user travels with, ready to invite to a new trip
export default function TravelersSection() {
  const travelers = useSavedTravelers();
  // Who's been on a trip with you; the list still shows without it
  const statuses = useSavedTravelerStatus().data || {};
  const [query, setQuery] = useState("");
  const [editing, setEditing] = useState(null); // a traveler, {} for a new one, or null
  const [inviting, setInviting] = useState(null); // the traveler being invited

  const all = useMemo(() => travelers.data || [], [travelers.data]);
  const shown = useMemo(() => {
    const q = query.trim().toLowerCase();
    return q ? all.filter((t) => `${t.name} ${t.email || ""} ${t.relation || ""}`.toLowerCase().includes(q)) : all;
  }, [all, query]);

  return (
    <div>
      <SectionHeading
        title="Saved travelers"
        description="People you travel with. Invite them to a trip in one tap."
        action={
          <button onClick={() => setEditing({})} className={primaryButton}>
            <Plus size={16} strokeWidth={2.5} />
            Add traveler
          </button>
        }
      />

      {all.length > 3 && (
        <div className="relative mt-5">
          <label htmlFor="travelers-search" className="sr-only">Search saved travelers</label>
          <Search size={16} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500" aria-hidden="true" />
          <input
            id="travelers-search"
            className={`${fieldClass} pl-10`}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search by name or email"
          />
        </div>
      )}

      {travelers.isLoading && (
        <div className="py-10 text-center text-slate-400">
          <Loader2 className="mx-auto animate-spin" />
        </div>
      )}
      {travelers.isError && <p className="mt-5 text-sm text-red-600">Couldn't load saved travelers: {travelers.error.message}</p>}

      {!travelers.isLoading && !travelers.isError && all.length === 0 && (
        <button
          onClick={() => setEditing({})}
          className="mt-5 block w-full rounded-2xl border-2 border-dashed border-slate-300 p-6 text-center text-sm text-slate-600 transition hover:border-violet-400 hover:bg-violet-50/40"
        >
          <strong className="block text-base text-slate-900">No saved travelers yet</strong>
          Add the people you travel with most. You can also save anyone on one of your trips from its Travel Crew tab.
        </button>
      )}

      {shown.length > 0 && (
        <ul className="mt-4">
          {shown.map((t) => (
            <li key={t.id} className="flex flex-wrap items-center gap-3.5 border-b border-slate-200 px-1 py-3.5 last:border-b-0">
              <CrewAvatar person={{ name: t.name, avatarUrl: statuses[t.id]?.avatarUrl }} size="h-12 w-12" textSize="text-sm" />
              <div className="min-w-0 flex-[1_1_200px]">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-extrabold text-slate-900">{t.name}</span>
                  {t.relation && (
                    <span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-bold text-slate-700">{t.relation}</span>
                  )}
                </div>
                <div className="mt-0.5 truncate text-sm text-slate-600">{t.email || "No email saved"}</div>
                <TravelerStatus status={statuses[t.id]} />
              </div>
              <button onClick={() => setInviting(t)} className={`${secondaryButton} min-h-[40px] px-3.5 py-2 text-sm`}>
                <Plane size={15} />
                Invite to a trip
              </button>
              <button
                onClick={() => setEditing(t)}
                className={`${secondaryButton} min-h-[40px] w-10 px-0 py-2`}
                aria-label={`Edit ${t.name}`}
              >
                <Pencil size={15} />
              </button>
            </li>
          ))}
        </ul>
      )}
      {query && shown.length === 0 && all.length > 0 && (
        <p className="mt-5 text-sm text-slate-600">No one matches “{query}”.</p>
      )}

      <p className="mt-4 text-[13px] text-slate-500">Only you can see this list.</p>

      <Modal open={!!editing} onClose={() => setEditing(null)} className="max-h-[90vh] max-w-md overflow-y-auto p-6">
        {editing && <TravelerForm key={editing.id || "new"} traveler={editing} onClose={() => setEditing(null)} />}
      </Modal>
      <Modal open={!!inviting} onClose={() => setInviting(null)} className="max-h-[90vh] max-w-md overflow-y-auto p-6">
        {inviting && <InviteToTrip traveler={inviting} onClose={() => setInviting(null)} />}
      </Modal>
    </div>
  );
}

// "On Trip Planner · 3 trips together", "Joined as a guest · 1 trip together" or "No trips
// together yet". Only trips you share count, so it never says whether someone you haven't
// traveled with has an account.
export function TravelerStatus({ status }) {
  if (!status) return null;
  const trips = status.tripsTogether;
  const together = `${trips} trip${trips === 1 ? "" : "s"} together`;
  const [dot, text] = status.onTripPlanner
    ? ["bg-emerald-500", `On Trip Planner · ${together}`]
    : trips
      ? ["bg-slate-400", `Joined as a guest · ${together}`]
      : ["bg-slate-300", "No trips together yet"];
  return (
    <div className="mt-1 flex items-center gap-1.5 text-xs font-semibold text-slate-600">
      <span className={`h-2 w-2 flex-none rounded-full ${dot}`} aria-hidden="true" />
      {text}
    </div>
  );
}

// Add or edit a saved traveler; `traveler` is {} for a new one
function TravelerForm({ traveler, onClose }) {
  const save = useSaveTraveler();
  const remove = useDeleteTraveler();
  const [form, setForm] = useState({
    name: traveler.name || "",
    email: traveler.email || "",
    relation: traveler.relation || "Friend",
  });
  const [invalid, setInvalid] = useState("");
  const set = (key) => (e) => {
    setForm((f) => ({ ...f, [key]: e.target.value }));
    setInvalid("");
  };

  const submit = (e) => {
    e.preventDefault();
    if (!form.name.trim()) return setInvalid("Please enter a name.");
    if (form.email.trim() && !EMAIL_RE.test(form.email.trim())) return setInvalid("Please enter a valid email.");
    save.mutate({ id: traveler.id, name: form.name.trim(), email: form.email, relation: form.relation }, { onSuccess: onClose });
  };

  const error = invalid || save.error?.message || remove.error?.message;
  return (
    <form onSubmit={submit}>
      <h2 className="text-lg font-extrabold text-slate-900">{traveler.id ? "Edit traveler" : "Add a traveler"}</h2>
      <p className="mt-1 text-sm text-slate-600">With an email, you can send them a trip invite in one tap.</p>
      <div className="mt-5 space-y-4">
        <Field label="Name" htmlFor="traveler-name">
          <input id="traveler-name" className={fieldClass} value={form.name} onChange={set("name")} maxLength={100} autoFocus />
        </Field>
        <Field label="Email (optional)" htmlFor="traveler-email">
          <input id="traveler-email" type="email" className={fieldClass} value={form.email} onChange={set("email")} maxLength={200} />
        </Field>
        <Field label="Relationship" htmlFor="traveler-relation">
          <select id="traveler-relation" className={fieldClass} value={form.relation} onChange={set("relation")}>
            {RELATION_OPTIONS.map((r) => (
              <option key={r}>{r}</option>
            ))}
          </select>
        </Field>
      </div>
      {error && <p className="mt-4 text-sm text-red-600">{error}</p>}
      <div className="mt-6 flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 pt-4">
        {traveler.id ? (
          <button
            type="button"
            onClick={() => window.confirm(`Remove ${traveler.name} from your saved travelers?`) && remove.mutate(traveler.id, { onSuccess: onClose })}
            disabled={remove.isPending}
            className="text-sm font-semibold text-red-600 hover:underline"
          >
            Remove
          </button>
        ) : (
          <span />
        )}
        <div className="flex gap-2">
          <button type="button" onClick={onClose} className={secondaryButton}>Cancel</button>
          <button type="submit" disabled={save.isPending} className={primaryButton}>
            {save.isPending && <Loader2 size={16} className="animate-spin" />}
            Save
          </button>
        </div>
      </div>
    </form>
  );
}

// Pick one of the user's upcoming trips, then send that trip's invite link to the traveler
function InviteToTrip({ traveler, onClose }) {
  const { user } = useAuth();
  const trips = useTrips();
  const link = useMutation({ mutationFn: (tripId) => getInviteToken(tripId) });
  const [trip, setTrip] = useState(null);
  const [copied, setCopied] = useState(false);
  const today = todayIso();

  // Trips the user organizes that haven't ended yet
  const upcoming = (trips.data || [])
    .filter((t) => t.user_id === user.id && !["draft", "failed"].includes(tripStatus(t)))
    .map((t) => ({ ...t, range: tripRange(t) }))
    .filter((t) => !t.range || t.range.end >= today)
    .sort((a, b) => (a.range?.start || "").localeCompare(b.range?.start || ""));

  const choose = (t) => {
    setTrip(t);
    link.mutate(t.id);
  };

  const url = link.data?.token ? inviteUrl(link.data.token) : "";
  const firstName = traveler.name.split(" ")[0];
  const message = trip && `Hi ${firstName}! Join me on my trip to ${trip.destination}. See the itinerary here: ${url}`;
  const mailto =
    trip &&
    `mailto:${encodeURIComponent(traveler.email || "")}?subject=${encodeURIComponent(`Join my trip to ${trip.destination}`)}&body=${encodeURIComponent(message)}`;
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(message);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      // Clipboard blocked; the link is shown to copy by hand
    }
  };

  return (
    <div>
      <h2 className="text-lg font-extrabold text-slate-900">Invite {firstName} to a trip</h2>

      {!trip ? (
        <>
          <p className="mt-1 text-sm text-slate-600">Pick one of your upcoming trips.</p>
          {trips.isLoading ? (
            <div className="py-8 text-center text-slate-400"><Loader2 className="mx-auto animate-spin" /></div>
          ) : upcoming.length === 0 ? (
            <p className="mt-5 rounded-xl bg-slate-50 p-4 text-sm text-slate-600">
              You don't have any upcoming trips you're organizing. Plan one, then invite {firstName} from here.
            </p>
          ) : (
            <ul className="mt-4 space-y-2">
              {upcoming.map((t) => (
                <li key={t.id}>
                  <button
                    onClick={() => choose(t)}
                    className="flex w-full items-center gap-3 rounded-xl border-2 border-slate-200 p-3 text-left transition hover:border-violet-400 hover:bg-violet-50/40"
                  >
                    <span className="flex h-10 w-10 flex-none items-center justify-center rounded-lg bg-slate-100 text-xl">
                      <CountryFlag name={t.destination} />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate font-bold text-slate-900">{t.destination || "Untitled trip"}</span>
                      {t.range && (
                        <span className="flex items-center gap-1.5 text-[13px] text-slate-600">
                          <CalendarDays size={13} aria-hidden="true" />
                          {formatRange(t.range)}
                        </span>
                      )}
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          )}
          <div className="mt-6 flex justify-end">
            <button onClick={onClose} className={secondaryButton}>Cancel</button>
          </div>
        </>
      ) : (
        <>
          <p className="mt-1 text-sm text-slate-600">
            Send {firstName} the invite link for <strong>{trip.destination}</strong>.
            {link.data?.requireApproval !== false && " You'll get a notification to approve them when they join."}
          </p>
          {link.isPending && <div className="py-8 text-center text-slate-400"><Loader2 className="mx-auto animate-spin" /></div>}
          {link.isError && <p className="mt-4 text-sm text-red-600">{link.error.message}</p>}
          {url && (
            <>
              <div className="mt-4 rounded-xl bg-slate-50 p-3.5 text-sm text-slate-700">{message}</div>
              <div className="mt-5 flex flex-wrap justify-end gap-2">
                <button onClick={() => { setTrip(null); link.reset(); }} className={`${secondaryButton} mr-auto`}>Back</button>
                <button onClick={copy} className={secondaryButton}>
                  {copied ? <Check size={16} /> : <Copy size={16} />}
                  {copied ? "Copied" : "Copy message"}
                </button>
                {traveler.email && (
                  <a href={mailto} className={primaryButton}>
                    <Mail size={16} />
                    Email {firstName}
                  </a>
                )}
              </div>
            </>
          )}
        </>
      )}
    </div>
  );
}
