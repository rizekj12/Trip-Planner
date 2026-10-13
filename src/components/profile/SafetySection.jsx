import React, { useState } from "react";
import { Check } from "lucide-react";
import { useSaveProfile } from "../../hooks/useProfile";
import { ACCESSIBILITY_OPTIONS } from "../../utils/profile";
import { Field, SectionHeading, SaveBar, fieldClass } from "./ProfileUI";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const fromProfile = (profile) => ({
  needs: profile.accessibility_needs || [],
  notes: profile.accessibility_notes || "",
  emergencyName: profile.emergency_name || "",
  emergencyRelationship: profile.emergency_relationship || "",
  emergencyPhone: profile.emergency_phone || "",
  emergencyEmail: profile.emergency_email || "",
  shareEmergency: !!profile.share_emergency,
});

// "Safety & accessibility": needs that shape generated itineraries, and an emergency contact
// the organizer of a trip can see while it's on (if the user allows it)
export default function SafetySection({ profile }) {
  const save = useSaveProfile();
  const [initial, setInitial] = useState(() => fromProfile(profile));
  const [form, setForm] = useState(initial);
  const [message, setMessage] = useState(null);
  const dirty = JSON.stringify(form) !== JSON.stringify(initial);

  const update = (changes) => {
    setForm((f) => ({ ...f, ...changes }));
    setMessage(null);
  };
  const set = (key) => (e) => update({ [key]: e.target.value });
  const toggleNeed = (need) =>
    update({ needs: form.needs.includes(need) ? form.needs.filter((n) => n !== need) : [...form.needs, need] });

  const submit = async (e) => {
    e.preventDefault();
    const email = form.emergencyEmail.trim();
    if (email && !EMAIL_RE.test(email)) {
      return setMessage({ type: "error", text: "Please enter a valid email for your emergency contact." });
    }
    if ((form.emergencyName.trim() || email) && !form.emergencyPhone.trim()) {
      return setMessage({ type: "error", text: "Please add a phone number for your emergency contact." });
    }
    try {
      await save.mutateAsync({
        // Saving this section counts as answering it, even with no needs picked
        accessibility_needs: form.needs,
        accessibility_notes: form.notes.trim() || null,
        emergency_name: form.emergencyName.trim() || null,
        emergency_relationship: form.emergencyRelationship.trim() || null,
        emergency_phone: form.emergencyPhone.trim() || null,
        emergency_email: email || null,
        share_emergency: form.shareEmergency,
      });
      setInitial(form);
      setMessage({ type: "success", text: "Saved." });
    } catch (err) {
      setMessage({ type: "error", text: err.message || "Couldn't save. Please try again." });
    }
  };

  return (
    <form onSubmit={submit}>
      <SectionHeading
        title="Safety & accessibility"
        description="Helps us plan trips you can enjoy, and tells your organizer who to call if something goes wrong."
      />

      <fieldset className="mt-7">
        <legend className="text-base font-extrabold text-slate-900">Accessibility needs</legend>
        <p className="mb-3.5 mt-1 text-sm text-slate-600">
          New itineraries will plan around these, for example shorter walks, step-free routes and suitable places to eat.
        </p>
        <div className="flex flex-wrap gap-2.5">
          {ACCESSIBILITY_OPTIONS.map((need) => {
            const on = form.needs.includes(need);
            return (
              <button
                key={need}
                type="button"
                aria-pressed={on}
                onClick={() => toggleNeed(need)}
                className={`inline-flex min-h-[40px] items-center gap-2 rounded-full border-2 px-3.5 py-2 text-sm font-semibold transition ${
                  on ? "border-violet-600 bg-violet-50 text-violet-900" : "border-gray-200 bg-white text-slate-700 hover:border-violet-300"
                }`}
              >
                {on && <Check size={14} strokeWidth={3} aria-hidden="true" />}
                {need}
              </button>
            );
          })}
        </div>
        <Field label="Anything else we should know?" htmlFor="safety-notes" className="mt-4">
          <textarea
            id="safety-notes"
            rows={3}
            className={`${fieldClass} resize-y leading-relaxed`}
            value={form.notes}
            onChange={set("notes")}
            maxLength={500}
            placeholder="e.g. I need a break every couple of hours"
          />
        </Field>
      </fieldset>

      <fieldset className="mt-8">
        <legend className="text-base font-extrabold text-slate-900">Emergency contact</legend>
        <p className="mb-3.5 mt-1 text-sm text-slate-600">Only shared with a trip's organizer if you turn it on below.</p>
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
          <Field label="Name" htmlFor="ec-name">
            <input id="ec-name" className={fieldClass} value={form.emergencyName} onChange={set("emergencyName")} maxLength={100} placeholder="Full name" />
          </Field>
          <Field label="Relationship" htmlFor="ec-relationship">
            <input
              id="ec-relationship"
              className={fieldClass}
              value={form.emergencyRelationship}
              onChange={set("emergencyRelationship")}
              maxLength={60}
              placeholder="e.g. Sister"
            />
          </Field>
          <Field label="Phone" htmlFor="ec-phone">
            <input
              id="ec-phone"
              type="tel"
              className={fieldClass}
              value={form.emergencyPhone}
              onChange={set("emergencyPhone")}
              maxLength={40}
              placeholder="+1 (555) 000-0000"
            />
          </Field>
          <Field label="Email (optional)" htmlFor="ec-email">
            <input
              id="ec-email"
              type="email"
              className={fieldClass}
              value={form.emergencyEmail}
              onChange={set("emergencyEmail")}
              maxLength={200}
              placeholder="name@example.com"
            />
          </Field>
        </div>
        <label className="mt-4 flex cursor-pointer items-start gap-3 rounded-xl bg-slate-50 p-3.5">
          <input
            type="checkbox"
            checked={form.shareEmergency}
            onChange={(e) => update({ shareEmergency: e.target.checked })}
            className="mt-0.5 h-[18px] w-[18px] accent-violet-700"
          />
          <span className="text-sm text-slate-700">
            <span className="block font-bold text-slate-900">Share with the organizer while I'm traveling</span>
            The organizer of a trip you've joined can see it from 2 days before the trip until it ends.
          </span>
        </label>
      </fieldset>

      <SaveBar
        dirty={dirty}
        saving={save.isPending}
        onCancel={() => {
          setForm(initial);
          setMessage(null);
        }}
        message={message}
      />
    </form>
  );
}
