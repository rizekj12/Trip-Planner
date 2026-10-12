import React, { useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { Loader2, User, Mail, Users, CalendarDays } from "lucide-react";
import AuthLayout, { AuthInput, AuthMessage, AuthButton } from "../components/auth/AuthLayout";
import AuthScreen from "../components/auth/AuthScreen";
import CrewAvatar from "../components/crew/CrewAvatar";
import { useAuth } from "../context/AuthContext";
import { useJoinTrip } from "../hooks/useCrew";
import { getInvite } from "../utils/aiService";
import { getCountryFlagOnly } from "../utils/countryFlags";
import { formatRange } from "../utils/calendar";

// Invite link landing page (/join/:token), open without signing in. Signed-in users join as
// members; anyone else can sign in first or join this one trip as a guest.
export default function JoinPage() {
  const { token } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const invite = useQuery({ queryKey: ["invite", token], queryFn: () => getInvite(token), retry: false });
  const join = useJoinTrip(token);
  const [mode, setMode] = useState("choose"); // "choose" | "signin" | "guest"
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");

  // Sign in / create account right here; once signed in this page shows "Join this trip"
  if (!user && mode === "signin") return <AuthScreen />;

  const joinAsMember = () => join.mutate(null, { onSuccess: ({ tripId }) => navigate(`/trip/${tripId}`) });
  const joinAsGuest = (e) => {
    e.preventDefault();
    join.mutate({ name, email }, { onSuccess: ({ guestToken }) => navigate(`/guest/${guestToken}`) });
  };

  if (invite.isLoading) {
    return (
      <AuthLayout>
        <Loader2 className="mx-auto animate-spin" />
      </AuthLayout>
    );
  }

  if (invite.isError) {
    return (
      <AuthLayout>
        <div className="text-center">
          <h2 className="text-xl font-bold">This invite isn't valid</h2>
          <p className="mt-2 text-sm text-white/80">{invite.error.message}. Ask the organizer for a new link.</p>
          <Link to="/" className="mt-5 inline-block text-sm font-semibold underline">Go to Trip Planner</Link>
        </div>
      </AuthLayout>
    );
  }

  const trip = invite.data;
  const owner = { name: trip.ownerName, avatarUrl: trip.ownerAvatarUrl };

  return (
    <AuthLayout>
      {/* Trip preview */}
      <div className="text-center">
        <p className="text-xs font-bold uppercase tracking-[0.14em] text-amber-200">You're invited</p>
        <h2 className="mt-2 text-2xl font-extrabold">
          {getCountryFlagOnly(trip.destination)} {trip.destination}
        </h2>
        {trip.cities.length > 0 && <p className="text-sm text-white/80">{trip.cities.join(" · ")}</p>}
        <div className="mt-3 flex flex-wrap items-center justify-center gap-x-4 gap-y-1 text-sm text-white/85">
          {trip.start && (
            <span className="inline-flex items-center gap-1.5">
              <CalendarDays size={15} />
              {formatRange({ start: trip.start, end: trip.end || trip.start })}
            </span>
          )}
          <span className="inline-flex items-center gap-1.5">
            <Users size={15} />
            {trip.travelers} going
          </span>
        </div>
        <div className="mt-4 inline-flex items-center gap-2 rounded-full bg-white/15 py-1 pl-1 pr-3 text-sm">
          <CrewAvatar person={owner} size="h-7 w-7" />
          Organized by <span className="font-semibold">{trip.ownerName}</span>
        </div>
      </div>

      <div className="mt-6 space-y-3">
        <AuthMessage>{join.error?.message}</AuthMessage>

        {user ? (
          <button
            onClick={joinAsMember}
            disabled={join.isPending}
            className="w-full rounded-xl bg-gradient-to-r from-pink-500 to-purple-600 py-3 text-sm font-semibold shadow-lg disabled:opacity-60"
          >
            {join.isPending ? "Joining…" : "Join this trip"}
          </button>
        ) : mode === "guest" ? (
          <form onSubmit={joinAsGuest} className="space-y-4">
            <AuthInput label="Your name" icon={User} required value={name} onChange={(e) => setName(e.target.value)} placeholder="Your name" />
            <AuthInput label="Email" icon={Mail} type="email" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" />
            <p className="text-xs text-white/70">We'll use this for trip updates. You'll get a personal link to view this trip — bookmark it.</p>
            <AuthButton busy={join.isPending} busyLabel="Joining…">Join as guest</AuthButton>
            <button type="button" onClick={() => setMode("choose")} className="block w-full text-center text-sm text-white/80 underline">
              Back
            </button>
          </form>
        ) : (
          <>
            <button
              onClick={() => setMode("signin")}
              className="w-full rounded-xl bg-gradient-to-r from-pink-500 to-purple-600 py-3 text-sm font-semibold shadow-lg"
            >
              Sign in or create an account
            </button>
            <button
              onClick={() => setMode("guest")}
              className="w-full rounded-xl bg-white/15 py-3 text-sm font-semibold ring-1 ring-white/30 hover:bg-white/25"
            >
              Join as a guest
            </button>
            <p className="text-center text-xs text-white/70">
              With an account the trip appears on your dashboard. Guests get a view-only link for this trip.
            </p>
          </>
        )}
      </div>
    </AuthLayout>
  );
}
