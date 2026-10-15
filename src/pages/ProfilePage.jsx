import React, { useRef, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { ArrowLeft, Camera, Loader2, User, UserRound, ShieldAlert, IdCard, Users } from "lucide-react";
import { supabase } from "../utils/supabase";
import { useAuth } from "../context/AuthContext";
import AppHeader from "../components/AppHeader";
import BottomTabBar from "../components/BottomTabBar";
import CountryFlag from "../components/CountryFlag";
import AboutSection from "../components/profile/AboutSection";
import SafetySection from "../components/profile/SafetySection";
import DocumentsSection from "../components/profile/DocumentsSection";
import TravelersSection from "../components/profile/TravelersSection";
import { useProfile, useDocuments } from "../hooks/useProfile";
import { useTrips } from "../hooks/useTrips";
import { tripStatus } from "../utils/trips";

const TABS = [
  { id: "about", label: "About me", Icon: UserRound, iconClass: "bg-indigo-100 text-indigo-800" },
  { id: "safety", label: "Safety & accessibility", Icon: ShieldAlert, iconClass: "bg-rose-100 text-rose-800" },
  { id: "documents", label: "Travel documents", Icon: IdCard, iconClass: "bg-emerald-100 text-emerald-800" },
  { id: "travelers", label: "Saved travelers", Icon: Users, iconClass: "bg-amber-100 text-amber-800" },
];

// What counts toward "Profile N% complete", in the order we nudge for them
function completeness(user, profile, documents) {
  const items = [
    { done: !!user?.user_metadata?.full_name, todo: "Add your name", tab: "about" },
    { done: !!user?.user_metadata?.avatar_url, todo: "Add a profile photo", tab: "about" },
    { done: !!profile?.emergency_phone, todo: "Add an emergency contact before your next trip", tab: "safety" },
    { done: !!profile?.phone, todo: "Add your phone number", tab: "about" },
    { done: !!profile?.birthday, todo: "Add your birthday", tab: "about" },
    { done: !!profile?.bio, todo: "Write a short bio", tab: "about" },
    { done: (documents?.length || 0) > 0, todo: "Save your passport details", tab: "documents" },
  ];
  const done = items.filter((i) => i.done).length;
  return { percent: Math.round((done / items.length) * 100), left: items.length - done, next: items.find((i) => !i.done) };
}

// My Profile (Design A): identity band with photo and completeness, then a side menu of
// sections. ?tab=safety (etc.) opens a section directly.
export default function ProfilePage() {
  const { user } = useAuth();
  const profile = useProfile();
  const documents = useDocuments();
  const trips = useTrips();
  const [searchParams, setSearchParams] = useSearchParams();
  const tab = TABS.some((t) => t.id === searchParams.get("tab")) ? searchParams.get("tab") : "about";
  const openTab = (id) => setSearchParams(id === "about" ? {} : { tab: id }, { replace: true });

  const name = user?.user_metadata?.full_name || user?.email?.split("@")[0] || "";
  const homeCountry = user?.user_metadata?.home_country;
  const memberSince = user?.created_at
    ? new Date(user.created_at).toLocaleDateString(undefined, { month: "short", year: "numeric" })
    : null;
  const tripCount = (trips.data || []).filter((t) => !["draft", "failed"].includes(tripStatus(t))).length;
  const progress = completeness(user, profile.data, documents.data);

  return (
    <div className="min-h-screen bg-[#eef2f8] pb-24 text-slate-900 sm:pb-16">
      <AppHeader />

      <main className="mx-auto max-w-6xl px-4 pt-6 sm:px-6">
        <Link to="/" className="inline-flex items-center gap-1.5 text-sm font-semibold text-violet-800 hover:text-violet-950">
          <ArrowLeft size={16} />
          Back to my trips
        </Link>

        {/* Identity band */}
        <section className="mt-4 flex flex-wrap items-center gap-6 rounded-[20px] bg-white p-6 shadow-[0_1px_2px_rgba(15,43,91,.06),0_8px_24px_rgba(15,43,91,.06)] sm:p-7">
          <AvatarButton user={user} />
          <div className="min-w-0 flex-[1_1_260px]">
            <h1 className="truncate text-[28px] font-extrabold tracking-tight">{name}</h1>
            <p className="mt-1 flex flex-wrap items-center gap-x-1.5 text-[15px] text-slate-600">
              {homeCountry && (
                <span className="inline-flex items-center gap-1.5">
                  <CountryFlag name={homeCountry} size="text-base" /> Based in {homeCountry}
                </span>
              )}
              {homeCountry && memberSince && <span aria-hidden="true">·</span>}
              {memberSince && <span>Member since {memberSince}</span>}
              {trips.data && (
                <>
                  <span aria-hidden="true">·</span>
                  <span>{tripCount} trip{tripCount === 1 ? "" : "s"}</span>
                </>
              )}
            </p>
          </div>
          {profile.data && documents.data && (
            <div className="min-w-[220px] flex-[0_1_300px]">
              <div className="flex justify-between text-[13px] font-bold text-slate-700">
                <span>Profile {progress.percent}% complete</span>
                {progress.left > 0 && <span className="text-violet-800">{progress.left} left</span>}
              </div>
              <div
                className="mt-2 h-2 overflow-hidden rounded-full bg-violet-100"
                role="progressbar"
                aria-valuenow={progress.percent}
                aria-valuemin={0}
                aria-valuemax={100}
                aria-label="Profile completeness"
              >
                <div className="h-full rounded-full bg-violet-700 transition-all" style={{ width: `${progress.percent}%` }} />
              </div>
              {progress.next && (
                <button onClick={() => openTab(progress.next.tab)} className="mt-2 text-left text-[13px] text-slate-600 hover:text-violet-800 hover:underline">
                  {progress.next.todo}.
                </button>
              )}
            </div>
          )}
        </section>

        {/* Side menu + section */}
        <div className="mt-6 flex flex-wrap items-start gap-6">
          <nav
            aria-label="Profile sections"
            className="flex max-w-full flex-[1_1_240px] flex-col gap-1 rounded-[20px] bg-white p-3 shadow-[0_1px_2px_rgba(15,43,91,.06),0_8px_24px_rgba(15,43,91,.06)]"
          >
            {TABS.map(({ id, label, Icon, iconClass }) => {
              const current = id === tab;
              const needsContact = id === "safety" && profile.data && !profile.data.emergency_phone;
              return (
                <button
                  key={id}
                  onClick={() => openTab(id)}
                  aria-current={current ? "page" : undefined}
                  className={`flex min-h-[48px] w-full items-center gap-3 rounded-xl px-3.5 py-2.5 text-left text-[15px] font-semibold transition ${
                    current ? "bg-violet-100 text-violet-950" : "text-slate-700 hover:bg-slate-100"
                  }`}
                >
                  <span className={`flex h-[34px] w-[34px] flex-none items-center justify-center rounded-[10px] ${iconClass}`}>
                    <Icon size={18} aria-hidden="true" />
                  </span>
                  <span className="flex-1">{label}</span>
                  {needsContact && (
                    <span className="rounded-full bg-amber-100 px-2.5 py-1 text-xs font-bold text-amber-900">Add contact</span>
                  )}
                </button>
              );
            })}
            <p className="mt-2 rounded-xl bg-slate-50 px-3.5 py-3 text-[13px] leading-relaxed text-slate-600">
              <strong className="text-slate-900">Private by default.</strong> Travel partners see your name, photo and bio, nothing else.
            </p>
          </nav>

          <section className="min-w-0 flex-[999_1_560px] rounded-[20px] bg-white p-6 shadow-[0_1px_2px_rgba(15,43,91,.06),0_8px_24px_rgba(15,43,91,.06)] sm:p-7">
            {tab === "documents" ? (
              <DocumentsSection />
            ) : tab === "travelers" ? (
              <TravelersSection />
            ) : profile.isLoading ? (
              <div className="py-16 text-center text-slate-400">
                <Loader2 className="mx-auto animate-spin" />
              </div>
            ) : profile.isError ? (
              <p className="text-sm text-red-600">
                Couldn't load your profile: {profile.error.message}. (Have the migrations in supabase/migrations been applied?)
              </p>
            ) : tab === "safety" ? (
              <SafetySection profile={profile.data} />
            ) : (
              <AboutSection profile={profile.data} />
            )}
          </section>
        </div>
      </main>
      <BottomTabBar />
    </div>
  );
}

// Profile photo; click to upload a new one (saved to the avatars bucket and the login)
function AvatarButton({ user }) {
  const fileRef = useRef(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");
  const avatarUrl = user?.user_metadata?.avatar_url;

  const upload = async (e) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file || !user) return;
    setUploading(true);
    setError("");
    const ext = file.name.split(".").pop();
    const path = `${user.id}/avatar.${ext}`;
    const { error: uploadError } = await supabase.storage.from("avatars").upload(path, file, { upsert: true });
    if (uploadError) {
      setError("Upload failed: " + uploadError.message);
      setUploading(false);
      return;
    }
    const { data } = supabase.storage.from("avatars").getPublicUrl(path);
    // updateUser fires USER_UPDATED, so the header and this page refresh on their own
    const { error: updateError } = await supabase.auth.updateUser({ data: { avatar_url: `${data.publicUrl}?t=${Date.now()}` } });
    if (updateError) setError("Couldn't save your photo.");
    setUploading(false);
  };

  return (
    <div className="flex flex-col items-center gap-1">
      <button
        onClick={() => fileRef.current?.click()}
        disabled={uploading}
        aria-label="Change profile photo"
        className="group relative h-24 w-24 flex-none rounded-full bg-indigo-500 shadow-[0_0_0_4px_#ede9fe]"
      >
        <span className="flex h-full w-full items-center justify-center overflow-hidden rounded-full">
          {avatarUrl ? <img src={avatarUrl} alt="" className="h-full w-full object-cover" /> : <User size={40} className="text-white" />}
        </span>
        <span className="absolute -bottom-0.5 -right-0.5 flex h-8 w-8 items-center justify-center rounded-full bg-[#0f2b5b] text-white ring-[3px] ring-white transition group-hover:bg-violet-700">
          {uploading ? <Loader2 size={15} className="animate-spin" /> : <Camera size={15} />}
        </span>
      </button>
      <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={upload} />
      {error && <p className="max-w-[10rem] text-center text-xs text-red-600">{error}</p>}
    </div>
  );
}
