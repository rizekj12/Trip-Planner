import React, { useEffect, useRef, useState } from "react";
import { Plus, Lock, Pencil, Eye, EyeOff, Loader2, IdCard, Plane, ShieldCheck, Car, Stamp, Syringe, FileText, BadgeCheck, Paperclip, X, ExternalLink } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import Modal from "../Modal";
import { useDocuments, useSaveDocument, useDeleteDocument } from "../../hooks/useProfile";
import {
  DOCUMENT_KINDS, maskNumber, expiryStatus, revealDocumentNumber,
  uploadDocumentAttachment, removeDocumentAttachment, fetchDocumentAttachment,
} from "../../utils/profile";
import { prepareAttachment, formatSize } from "../../utils/attachmentFile";
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

const REVEAL_MS = 60 * 1000;

// "Travel documents": passport, Known Traveler Number, insurance and so on, private to the user
export default function DocumentsSection() {
  const documents = useDocuments();
  const [editing, setEditing] = useState(null); // a document, {} for a new one, or null
  const [viewing, setViewing] = useState(null); // the document whose attachment is open
  const docs = documents.data || [];

  // Full numbers are fetched (decrypted by the server) only when "Show" is pressed, kept in
  // memory only, and hidden again after a minute
  const [revealed, setRevealed] = useState({}); // id -> full number
  const [revealing, setRevealing] = useState(null); // id being fetched
  const [revealError, setRevealError] = useState("");
  const timers = useRef({});
  useEffect(() => () => Object.values(timers.current).forEach(clearTimeout), []);

  const hide = (id) => {
    clearTimeout(timers.current[id]);
    setRevealed(({ [id]: _hidden, ...rest }) => rest);
  };
  const toggleShown = async (id) => {
    if (revealed[id] !== undefined) return hide(id);
    setRevealing(id);
    setRevealError("");
    try {
      const number = await revealDocumentNumber(id);
      setRevealed((r) => ({ ...r, [id]: number || "" }));
      timers.current[id] = setTimeout(() => hide(id), REVEAL_MS);
    } catch (err) {
      setRevealError(err.message);
    } finally {
      setRevealing(null);
    }
  };

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
            const visible = revealed[doc.id] !== undefined;
            const details = [
              doc.label,
              doc.hasNumber && (visible ? revealed[doc.id] : maskNumber(doc.last4)),
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
                {doc.hasNumber && (
                  <button
                    onClick={() => toggleShown(doc.id)}
                    disabled={revealing === doc.id}
                    className={`${secondaryButton} min-h-[40px] px-3 py-2 text-sm`}
                    aria-label={`${visible ? "Hide" : "Show"} ${kind.label} number`}
                  >
                    {revealing === doc.id ? <Loader2 size={15} className="animate-spin" /> : visible ? <EyeOff size={15} /> : <Eye size={15} />}
                    {visible ? "Hide" : "Show"}
                  </button>
                )}
                {doc.attachment && (
                  <button
                    onClick={() => setViewing(doc)}
                    className={`${secondaryButton} min-h-[40px] px-3 py-2 text-sm`}
                    aria-label={`Open the ${kind.label} attachment`}
                  >
                    <Paperclip size={15} />
                    File
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

      {revealError && <p className="mt-3 text-sm text-red-600">{revealError}</p>}

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
      <AttachmentViewer document={viewing} onClose={() => setViewing(null)} />
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

// A document's photo or PDF, fetched (decrypted by the server) only while open. Photos show
// inline; PDFs open in a new tab. The file lives in memory only and is let go on close.
function AttachmentViewer({ document, onClose }) {
  const [state, setState] = useState({ url: null, error: "" });
  useEffect(() => {
    if (!document?.attachment) return undefined;
    let url = null;
    let cancelled = false;
    setState({ url: null, error: "" });
    fetchDocumentAttachment(document.id)
      .then((blob) => {
        url = URL.createObjectURL(blob);
        if (cancelled) URL.revokeObjectURL(url);
        else setState({ url, error: "" });
      })
      .catch((err) => !cancelled && setState({ url: null, error: err.message }));
    return () => {
      cancelled = true;
      if (url) URL.revokeObjectURL(url);
    };
  }, [document]);

  const attachment = document?.attachment;
  const kind = document && (DOCUMENT_KINDS[document.kind] || DOCUMENT_KINDS.other);
  return (
    <Modal open={!!attachment} onClose={onClose} className="max-h-[92vh] w-full max-w-2xl overflow-y-auto p-4 sm:p-6">
      {attachment && (
        <div>
          <div className="mb-3 flex items-start justify-between gap-3">
            <div className="min-w-0">
              <h2 className="text-lg font-extrabold text-slate-900">{kind.label}</h2>
              <p className="truncate text-sm text-slate-600">
                {attachment.name} · {formatSize(attachment.size)}
              </p>
            </div>
            <button onClick={onClose} className="rounded-lg p-2 text-slate-500 hover:bg-slate-100" aria-label="Close">
              <X size={18} />
            </button>
          </div>
          {state.error ? (
            <p className="text-sm text-red-600">{state.error}</p>
          ) : !state.url ? (
            <div className="py-16 text-center text-slate-400">
              <Loader2 className="mx-auto animate-spin" />
            </div>
          ) : attachment.type === "application/pdf" ? (
            <a href={state.url} target="_blank" rel="noreferrer" className={`${primaryButton} w-full`}>
              <ExternalLink size={16} />
              Open PDF
            </a>
          ) : (
            <img src={state.url} alt={`${kind.label} attachment`} className="mx-auto max-h-[70vh] w-auto rounded-xl" />
          )}
          <p className="mt-3 flex items-center gap-1.5 text-xs text-slate-500">
            <Lock size={12} aria-hidden="true" /> Stored encrypted. Only you can open it.
          </p>
        </div>
      )}
    </Modal>
  );
}

function DocumentForm({ document, onClose }) {
  const save = useSaveDocument();
  const remove = useDeleteDocument();
  const qc = useQueryClient();
  const [file, setFile] = useState(null); // prepared File to upload
  const [fileError, setFileError] = useState("");
  const [preparing, setPreparing] = useState(false);
  const [removeFile, setRemoveFile] = useState(false);
  const [busy, setBusy] = useState(false);
  const [submitError, setSubmitError] = useState("");
  // Once created, later attempts (e.g. after a failed upload) update it instead of adding another
  const [savedId, setSavedId] = useState(document.id || null);

  const chooseFile = async (e) => {
    const chosen = e.target.files?.[0];
    e.target.value = "";
    if (!chosen) return;
    setFileError("");
    setPreparing(true);
    try {
      setFile(await prepareAttachment(chosen));
      setRemoveFile(false);
    } catch (err) {
      setFile(null);
      setFileError(err.message);
    } finally {
      setPreparing(false);
    }
  };
  const [form, setForm] = useState({
    kind: document.kind || "passport",
    label: document.label || "",
    number: "", // never pre-filled: the saved number stays on the server unless replaced
    removeNumber: false,
    expires_on: document.expires_on || "",
    notes: document.notes || "",
  });
  const set = (key) => (e) => setForm((f) => ({ ...f, [key]: e.target.value }));
  const kind = DOCUMENT_KINDS[form.kind];

  const submit = async (e) => {
    e.preventDefault();
    setBusy(true);
    setSubmitError("");
    try {
      const saved = await save.mutateAsync({
        id: savedId || undefined,
        kind: form.kind,
        label: form.label.trim() || null,
        // A typed number replaces the saved one; blank keeps it (or removes it if asked)
        ...(form.number.trim() ? { number: form.number.trim() } : form.removeNumber ? { number: "" } : {}),
        expires_on: form.expires_on || null,
        notes: form.notes.trim() || null,
      });
      setSavedId(saved.id);
      if (file) await uploadDocumentAttachment(saved.id, file);
      else if (removeFile && document.attachment) await removeDocumentAttachment(saved.id);
      await qc.invalidateQueries({ queryKey: ["documents"] });
      onClose();
    } catch (err) {
      await qc.invalidateQueries({ queryKey: ["documents"] });
      setSubmitError(err.message || "Couldn't save. Please try again.");
    } finally {
      setBusy(false);
    }
  };

  const error = submitError ? { message: submitError } : remove.error;
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
        <Field
          label={kind.numberField}
          htmlFor="doc-number"
          hint={
            document.hasNumber
              ? `Saved as ${maskNumber(document.last4)}. Leave blank to keep it.`
              : "Encrypted before it's saved. Only you can see it."
          }
        >
          <input
            id="doc-number"
            className={`${fieldClass} font-mono`}
            value={form.number}
            onChange={set("number")}
            maxLength={100}
            autoComplete="off"
            spellCheck={false}
            disabled={form.removeNumber}
            placeholder={document.hasNumber ? "Enter a new number to replace it" : ""}
          />
          {document.hasNumber && (
            <label className="mt-2 flex items-center gap-2 text-sm text-slate-700">
              <input
                type="checkbox"
                checked={form.removeNumber}
                onChange={(e) => setForm((f) => ({ ...f, removeNumber: e.target.checked, number: "" }))}
                className="h-4 w-4 accent-violet-700"
              />
              Remove the saved number
            </label>
          )}
        </Field>
        <Field
          label="Photo or PDF (optional)"
          htmlFor="doc-file"
          hint="Up to 10 MB. Photos are cleaned of location data. Stored encrypted, only you can open it."
        >
          {document.attachment && !file && (
            <div className={`mb-2 flex items-center gap-2 rounded-xl bg-slate-50 px-3 py-2 text-sm ${removeFile ? "text-slate-400 line-through" : "text-slate-700"}`}>
              <Paperclip size={15} aria-hidden="true" />
              <span className="min-w-0 flex-1 truncate">{document.attachment.name} · {formatSize(document.attachment.size)}</span>
              <button type="button" onClick={() => setRemoveFile((r) => !r)} className="font-bold text-red-600 no-underline hover:underline">
                {removeFile ? "Keep" : "Remove"}
              </button>
            </div>
          )}
          {file && (
            <div className="mb-2 flex items-center gap-2 rounded-xl bg-violet-50 px-3 py-2 text-sm text-violet-900">
              <Paperclip size={15} aria-hidden="true" />
              <span className="min-w-0 flex-1 truncate">{file.name} · {formatSize(file.size)}</span>
              <button type="button" onClick={() => setFile(null)} className="rounded p-1 hover:bg-violet-100" aria-label="Don't attach this file">
                <X size={15} />
              </button>
            </div>
          )}
          <label className={`${secondaryButton} w-full cursor-pointer`}>
            {preparing ? <Loader2 size={16} className="animate-spin" /> : <Paperclip size={16} />}
            {preparing ? "Preparing…" : document.attachment || file ? "Choose a different file" : "Attach a photo or PDF"}
            <input id="doc-file" type="file" accept="image/*,application/pdf" onChange={chooseFile} className="sr-only" />
          </label>
          {fileError && <p className="mt-1.5 text-sm text-red-600">{fileError}</p>}
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
          <button type="submit" disabled={busy || preparing} className={primaryButton}>
            {busy && <Loader2 size={16} className="animate-spin" />}
            {busy && file ? "Uploading…" : "Save"}
          </button>
        </div>
      </div>
    </form>
  );
}
