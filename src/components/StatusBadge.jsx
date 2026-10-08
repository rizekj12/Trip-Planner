import React from "react";

const STATUSES = {
  draft: { label: "Draft", dot: "bg-gray-300" },
  pending: { label: "Pending", dot: "bg-yellow-400", pulse: true },
  ready: { label: "Ready", dot: "bg-green-400" },
  failed: { label: "Failed", dot: "bg-red-500" },
};

// Small pill with a colored dot, e.g. "● Pending". `status` comes from tripStatus().
export default function StatusBadge({ status }) {
  const s = STATUSES[status] || STATUSES.ready;
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full bg-black/25 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wide text-white backdrop-blur-sm">
      <span className="relative flex h-2 w-2">
        {s.pulse && <span className={`absolute inline-flex h-full w-full animate-ping rounded-full opacity-75 ${s.dot}`} />}
        <span className={`relative inline-flex h-2 w-2 rounded-full ${s.dot}`} />
      </span>
      {s.label}
    </span>
  );
}
