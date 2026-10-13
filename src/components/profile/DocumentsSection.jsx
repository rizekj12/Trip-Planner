import React, { useState } from "react";
import { Plus, Lock, Pencil, Eye, EyeOff, Loader2, IdCard, Plane, ShieldCheck, Car, Stamp, Syringe, FileText, BadgeCheck } from "lucide-react";
import Modal from "../Modal";
import { useDocuments, useSaveDocument, useDeleteDocument } from "../../hooks/useProfile";
import { DOCUMENT_KINDS, maskNumber, expiryStatus } from "../../utils/profile";
import { Field, SectionHeading, Pill, fieldClass, primaryButton, secondaryButton } from "./ProfileUI";

const KIND_STYLE = {
  passport: { Icon: IdCard, className: "bg-blue-100 text-blue-900" },
  known_traveler: { Icon: BadgeCheck, className: "bg-indigo-100 text-indigo-800" },
  drivers_license: { Icon: Car, className: "bg-slate-200 text-slate-800" },
  visa: { Icon: Stamp, className: "bg-orange-100 text-orange-800" },
  insurance: { Icon: ShieldCheck, className: "bg-emerald-100 text-emerald-800" },
  frequent_flyer: { Icon: Plane, className: "bg-pink-100 text-pink-800" },
  vaccination: { Icon: Syringe, className: "bg-cyan-100 text-cyan-900" },
  other: { Icon: FileText, className: "bg-slate-100 text-slate-700" },
};

const formatDate = (iso) =>
  new Date(`${iso}T00:00:00`).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });

// "Travel documents": passport, Known Traveler Number, insurance and so on, private to the user
export default function DocumentsSection() {
  const documents = useDocuments();
  const [editing, setEditing] = useState(null); // a document, {} for a new one, or null
  const [shown, setShown] = useState(() => new Set()); // ids whose full number is visible
  const docs = documents.data || [];

  const toggleShown = (id) =>
    setShown((s) => {
      const next = new Set(s);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });

  return (
    <div>
      <SectionHeading
        title="Travel documents"
        description="Keep the numbers you need at the airport in one place."
        action={
          <button onClick={() => setEditing({})} className={primaryButton}>
            <Plus size={16} strokeWidth={2.5} />
            Add document
          </button>
        }
      />
      <p className="mt-5 flex items-center gap-3 rounded-xl bg-emerald-50 px-3.5 py-3 text-sm text-emerald-900">
        <Lock size={18} className="flex-none" aria-hidden="true" />
        Only you can see these. They're never shared with travel partners or added to trip PDFs.
      </p>

      {documents.isLoading && (
        <div className="py-10 text-center text-slate-400">
          <Loader2 className="mx-auto animate-spin" />
        </div>
      )}
      {documents.isError && <p className="mt-5 text-sm text-red-600">Couldn't load your documents: {documents.error.message}</p>}

      {docs.length > 0 && (
        <ul className="mt-5 space-y-3">
          {docs.map((doc) => {
            const kind = DOCUMENT_KINDS[doc.kind] || DOCUMENT_KINDS.other;
            const { Icon, className } = KIND_STYLE[doc.kind] || KIND_STYLE.other;
            const status = expiryStatus(doc);
            const visible = shown.has(doc.id);
            const details = [
              doc.label,
              doc.number && (visible ? doc.number : maskNumber(doc.number)),
              doc.expires_on && `Expires ${formatDate(doc.expires_on)}`,
            ].filter(Boolean);
            return (
              <li key={doc.id} className="flex flex-wrap items-center gap-4 rounded-2xl border-2 border-slate-200 p-4">
                <span className={`flex h-12 w-12 flex-none items-center justify-center rounded-xl ${className}`}>
                  <Icon size={22} aria-hidden="true" />
                </span>
                <div className="min-w-0 flex-[1_1_200px]">
                  <div className="font-extrabold text-slate-900">{kind.label}</div>
                  <div className={`mt-0.5 text-sm text-slate-600 ${visible ? "font-mono" : ""}`}>{details.join(" · ")}</div>
                  {doc.notes && <div className="mt-1 text-[13px] text-slate-500">{doc.notes}</div>}
                </div>
                <Pill tone={status.tone}>{status.text}</Pill>
                {doc.number && (
                  <button
                    onClick={() => toggleShown(doc.id)}
                    className={`${secondaryButton} min-h-[40px] px-3 py-2 text-sm`}
                    aria-label={`${visible ? "Hide" : "Show"} ${kind.label} number`}
                  >
                    {visible ? <EyeOff size={15} /> : <Eye size={15} />}
                    {visible ? "Hide" : "Show"}
                  </button>
                )}
                <button
                  onClick={() => setEditing(doc)}
                  className={`${secondaryButton} min-h-[40px] w-10 px-0 py-2`}
                  aria-label={`Edit ${kind.label}`}
                >
                  <Pencil size={15} />
                </button>
              </li>
            );
          })}
        </ul>
      )}

      {!documents.isLoading && !documents.isError && (
        <button
          onClick={() => setEditing({})}
          className="mt-4 block w-full rounded-2xl border-2 border-dashed border-slate-300 p-5 text-center text-sm text-slate-600 transition hover:border-violet-400 hover:bg-violet-50/40"
        >
          {docs.length ? (
            <>
              Add a <strong>visa</strong>, <strong>driver's license</strong>, <strong>vaccination record</strong> or{" "}
              <strong>frequent flyer number</strong>.
            </>
          ) : (
            <>
              <strong className="block text-base text-slate-900">No documents yet</strong>
              Add your passport first; we'll remind you when it's close to expiring.
            </>
          )}
        </button>
      )}

      <DocumentModal document={editing} onClose={() => setEditing(null)} />
    </div>
  );
}

// Add or edit one document; `document` is {} for a new one
function DocumentModal({ document, onClose }) {
  const open = !!document;
  return (
    <Modal open={open} onClose={onClose} className="max-h-[90vh] max-w-lg overflow-y-auto p-6">
      {open && <DocumentForm key={document.id || "new"} document={document} onClose={onClose} />}
    </Modal>
  );
}

function DocumentForm({ document, onClose }) {
  const save = useSaveDocument();
  const remove = useDeleteDocument();
  const [form, setForm] = useState({
    kind: document.kind || "passport",
    label: document.label || "",
    number: document.number || "",
    expires_on: document.expires_on || "",
    notes: document.notes || "",
  });
  const set = (key) => (e) => setForm((f) => ({ ...f, [key]: e.target.value }));
  const kind = DOCUMENT_KINDS[form.kind];

  const submit = (e) => {
    e.preventDefault();
    save.mutate(
      {
        id: document.id,
        kind: form.kind,
        label: form.label.trim() || null,
        number: form.number.trim() || null,
        expires_on: form.expires_on || null,
        notes: form.notes.trim() || null,
      },
      { onSuccess: onClose }
    );
  };

  const error = save.error || remove.error;
  return (
    <form onSubmit={submit}>
      <h2 className="text-lg font-extrabold text-slate-900">{document.id ? `Edit ${kind.label.toLowerCase()}` : "Add a travel document"}</h2>
      <p className="mt-1 text-sm text-slate-600">Only you can see this.</p>

      <div className="mt-5 space-y-4">
        <Field label="Type" htmlFor="doc-kind">
          <select id="doc-kind" className={fieldClass} value={form.kind} onChange={set("kind")}>
            {Object.entries(DOCUMENT_KINDS).map(([value, { label }]) => (
              <option key={value} value={value}>{label}</option>
            ))}
          </select>
        </Field>
        <Field label={kind.labelField} htmlFor="doc-label">
          <input id="doc-label" className={fieldClass} value={form.label} onChange={set("label")} maxLength={100} />
        </Field>
        <Field label={kind.numberField} htmlFor="doc-number">
          <input id="doc-number" className={`${fieldClass} font-mono`} value={form.number} onChange={set("number")} maxLength={100} autoComplete="off" />
        </Field>
        <Field label="Expires (optional)" htmlFor="doc-expires">
          <input id="doc-expires" type="date" className={fieldClass} value={form.expires_on} onChange={set("expires_on")} />
        </Field>
        <Field label="Notes (optional)" htmlFor="doc-notes">
          <textarea
            id="doc-notes"
            rows={2}
            className={`${fieldClass} resize-y`}
            value={form.notes}
            onChange={set("notes")}
            maxLength={500}
            placeholder="e.g. 24/7 assistance line"
          />
        </Field>
      </div>

      {error && <p className="mt-4 text-sm text-red-600">{error.message}</p>}

      <div className="mt-6 flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 pt-4">
        {document.id ? (
          <button
            type="button"
            onClick={() => window.confirm("Delete this document?") && remove.mutate(document.id, { onSuccess: onClose })}
            disabled={remove.isPending}
            className="text-sm font-semibold text-red-600 hover:underline"
          >
            Delete
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
