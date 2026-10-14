import React from "react";
import { Loader2 } from "lucide-react";

// Building blocks shared by the profile page's sections (Design A: white cards on a light page)

export const fieldClass =
  "w-full min-h-[44px] rounded-xl border-2 border-gray-200 bg-white px-3.5 py-2.5 text-[15px] text-gray-900 placeholder-gray-400 focus:border-violet-600 focus:outline-none disabled:bg-slate-50 disabled:text-slate-500";

export const primaryButton =
  "inline-flex min-h-[44px] items-center justify-center gap-2 rounded-xl bg-violet-700 px-4 py-2.5 text-[15px] font-bold text-white transition hover:bg-violet-800 disabled:opacity-60";

export const secondaryButton =
  "inline-flex min-h-[44px] items-center justify-center gap-2 rounded-xl border-2 border-gray-200 bg-white px-4 py-2.5 text-[15px] font-bold text-slate-800 transition hover:border-violet-300 disabled:opacity-60";

// Label above a control; `hint` is a line of help underneath
export function Field({ label, htmlFor, hint, children, className = "" }) {
  return (
    <div className={className}>
      <label htmlFor={htmlFor} className="mb-1.5 block text-xs font-bold uppercase tracking-wide text-slate-600">
        {label}
      </label>
      {children}
      {hint && <div className="mt-1.5 text-[13px] text-slate-500">{hint}</div>}
    </div>
  );
}

// A section's title, description and an optional action on the right
export function SectionHeading({ title, description, action }) {
  return (
    <div className="flex flex-wrap items-end justify-between gap-3">
      <div>
        <h2 className="text-[22px] font-extrabold text-slate-900">{title}</h2>
        {description && <p className="mt-1 text-sm text-slate-600">{description}</p>}
      </div>
      {action}
    </div>
  );
}

// Save / Cancel row at the bottom of a form, with the result of the last save
export function SaveBar({ dirty, saving, onCancel, message }) {
  return (
    <div className="mt-7 flex flex-wrap items-center justify-end gap-3 border-t border-slate-200 pt-5">
      {message && (
        <p role="status" className={`mr-auto text-sm ${message.type === "error" ? "text-red-600" : "text-emerald-700"}`}>
          {message.text}
        </p>
      )}
      {dirty && (
        <button type="button" onClick={onCancel} className={secondaryButton}>
          Cancel
        </button>
      )}
      <button type="submit" disabled={!dirty || saving} className={primaryButton}>
        {saving && <Loader2 size={16} className="animate-spin" />}
        {saving ? "Saving…" : "Save changes"}
      </button>
    </div>
  );
}

// Small rounded label, e.g. a document's expiry status
const PILL_TONES = {
  ok: "bg-emerald-100 text-emerald-800",
  warn: "bg-amber-100 text-amber-800",
  bad: "bg-red-100 text-red-800",
  none: "bg-slate-100 text-slate-700",
};
export function Pill({ tone = "none", children }) {
  return <span className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-bold ${PILL_TONES[tone]}`}>{children}</span>;
}
