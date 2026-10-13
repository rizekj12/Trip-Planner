import React, { useState } from "react";
import { Lock } from "lucide-react";
import HomeCountryMenu from "../HomeCountryMenu";
import { supabase } from "../../utils/supabase";
import { useAuth } from "../../context/AuthContext";
import { useSaveProfile } from "../../hooks/useProfile";
import { GENDER_OPTIONS, BIO_MAX } from "../../utils/profile";
import { todayIso } from "../../utils/calendar";
import { Field, SectionHeading, SaveBar, fieldClass } from "./ProfileUI";

const fromProfile = (user, profile) => ({
  fullName: user?.user_metadata?.full_name || "",
  phone: profile.phone || "",
  birthday: profile.birthday || "",
  gender: profile.gender || "",
  bio: profile.bio || "",
});

// "About me": name (on the login), plus phone, birthday, gender and bio (profiles table).
// "Based in" saves on its own as soon as a country is picked.
export default function AboutSection({ profile }) {
  const { user } = useAuth();
  const save = useSaveProfile();
  const [initial, setInitial] = useState(() => fromProfile(user, profile));
  const [form, setForm] = useState(initial);
  const [message, setMessage] = useState(null);
  const [savingName, setSavingName] = useState(false);
  const set = (key) => (e) => {
    setForm((f) => ({ ...f, [key]: e.target.value }));
    setMessage(null);
  };

  // A gender that isn't one of the listed options was typed in ("Self-describe")
  const customGender = form.gender && !GENDER_OPTIONS.includes(form.gender);
  const [selfDescribe, setSelfDescribe] = useState(customGender);
  const dirty = JSON.stringify(form) !== JSON.stringify(initial);

  const submit = async (e) => {
    e.preventDefault();
    setMessage(null);
    try {
      if (form.fullName.trim() !== initial.fullName) {
        setSavingName(true);
        const { error } = await supabase.auth.updateUser({ data: { full_name: form.fullName.trim() } });
        setSavingName(false);
        if (error) throw error;
      }
      await save.mutateAsync({
        phone: form.phone.trim() || null,
        birthday: form.birthday || null,
        gender: form.gender.trim() || null,
        bio: form.bio.trim() || null,
      });
      setInitial(form);
      setMessage({ type: "success", text: "Saved." });
    } catch (err) {
      setSavingName(false);
      setMessage({ type: "error", text: err.message || "Couldn't save. Please try again." });
    }
  };

  return (
    <form onSubmit={submit}>
      <SectionHeading title="About me" description="The basics. Your bio is shown to people on your trips." />

      <div className="mt-6 grid grid-cols-1 gap-5 sm:grid-cols-2">
        <Field label="Full name" htmlFor="about-name">
          <input id="about-name" className={fieldClass} value={form.fullName} onChange={set("fullName")} maxLength={100} autoComplete="name" />
        </Field>
        <Field label="Email" htmlFor="about-email" hint="Your sign-in email can't be changed here.">
          <div className="relative">
            <input id="about-email" className={`${fieldClass} pr-10`} value={user?.email || ""} disabled />
            <Lock size={16} className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-500" aria-hidden="true" />
          </div>
        </Field>
        <Field label="Phone number" htmlFor="about-phone">
          <input
            id="about-phone"
            type="tel"
            className={fieldClass}
            value={form.phone}
            onChange={set("phone")}
            maxLength={40}
            autoComplete="tel"
            placeholder="+1 (555) 000-0000"
          />
        </Field>
        <Field label="Birthday" htmlFor="about-birthday">
          <input
            id="about-birthday"
            type="date"
            className={fieldClass}
            value={form.birthday}
            onChange={set("birthday")}
            max={todayIso()}
            min="1900-01-01"
            autoComplete="bday"
          />
        </Field>
        <Field label="Gender" htmlFor="about-gender">
          <select
            id="about-gender"
            className={fieldClass}
            value={selfDescribe ? "self" : form.gender}
            onChange={(e) => {
              const value = e.target.value;
              setSelfDescribe(value === "self");
              setForm((f) => ({ ...f, gender: value === "self" ? "" : value }));
              setMessage(null);
            }}
          >
            <option value="">Choose…</option>
            {GENDER_OPTIONS.map((g) => (
              <option key={g} value={g}>{g}</option>
            ))}
            <option value="self">Self-describe…</option>
          </select>
          {selfDescribe && (
            <input
              aria-label="Describe your gender"
              className={`${fieldClass} mt-2`}
              value={form.gender}
              onChange={set("gender")}
              maxLength={60}
              placeholder="How you describe your gender"
            />
          )}
        </Field>
        <Field label="Based in" htmlFor="about-country" hint="Saves as soon as you pick a country.">
          <HomeCountryMenu fullWidth tone="light" id="about-country" />
        </Field>
        <Field
          label="Bio"
          htmlFor="about-bio"
          className="sm:col-span-2"
          hint={
            <span className="flex justify-between gap-3">
              <span>A line or two about how you like to travel.</span>
              <span aria-live="polite">{form.bio.length} / {BIO_MAX}</span>
            </span>
          }
        >
          <textarea
            id="about-bio"
            rows={4}
            className={`${fieldClass} resize-y leading-relaxed`}
            value={form.bio}
            onChange={set("bio")}
            maxLength={BIO_MAX}
            placeholder="Coffee first, then museums…"
          />
        </Field>
      </div>

      <SaveBar
        dirty={dirty}
        saving={save.isPending || savingName}
        onCancel={() => {
          setForm(initial);
          setSelfDescribe(initial.gender && !GENDER_OPTIONS.includes(initial.gender));
          setMessage(null);
        }}
        message={message}
      />
    </form>
  );
}
