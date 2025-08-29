import React from 'react';
import { FaYoutube } from "react-icons/fa";
import { SiGooglemaps, SiTiktok } from "react-icons/si";
import { FiX, FiGlobe } from "react-icons/fi";

/**
 * Props:
 * - open: boolean
 * - onClose: () => void
 * - active: { title, region?, links?: { maps?, youtube?, tiktok?, website? } }
 * - themeKey: "tokyo" | "kansai"  (controls colors)
 */
export default function MarkerInfoModal({ open, onClose, active, themeKey = "tokyo" }) {
    if (!open || !active) return null;

    const header =
        themeKey === "kansai"
            ? "bg-red-600 text-white"
            : "bg-indigo-600 text-white";

    const chip =
        themeKey === "kansai"
            ? "bg-red-200/80 text-red-900"
            : "bg-indigo-200/80 text-indigo-900";

    return (
        <div
            className="fixed inset-0 z-[9999] flex items-center justify-center p-4"
            aria-modal="true"
            role="dialog"
        >
            {/* backdrop */}
            <div
                className="absolute inset-0 bg-black/40 backdrop-blur-sm"
                onClick={onClose}
            />

            {/* card */}
            <div className="relative z-10 w-full max-w-sm overflow-hidden rounded-2xl bg-white text-zinc-900 shadow-2xl ring-1 ring-black/10">
                {/* header */}
                <div className={`flex items-center justify-between px-4 py-3 ${header}`}>
                    <div className="min-w-0">
                        <div className="truncate text-base font-semibold">{active.title}</div>
                        {active.region && (
                            <div className="mt-0.5 text-xs opacity-90">{active.region}</div>
                        )}
                    </div>
                    <button
                        onClick={onClose}
                        className="rounded-md p-1 hover:bg-white/15"
                        aria-label="Close"
                        title="Close"
                    >
                        <FiX size={18} />
                    </button>
                </div>

                {/* body */}
                <div className="px-4 py-4">
                    {/* optional note/chips row; add more chips if you want */}
                    <div className="mb-3 flex flex-wrap gap-2">
                        {active.distanceLabel && (
                            <span className={`rounded-full px-2.5 py-1 text-xs font-medium ${chip}`}>
                                {active.distanceLabel}
                            </span>
                        )}
                        {active.note && (
                            <span className="rounded-full bg-zinc-100 px-2.5 py-1 text-xs">
                                {active.note}
                            </span>
                        )}
                    </div>

                    {/* links */}
                    <div className="flex flex-wrap gap-3">
                        {active.links?.maps && (
                            <a
                                href={active.links.maps}
                                target="_blank"
                                rel="noreferrer"
                                className="flex items-center gap-2 rounded-xl bg-indigo-600 px-3 py-2 text-white hover:bg-indigo-700"
                                title="Open in Google Maps"
                            >
                                <SiGooglemaps size={18} />
                                <span className="text-sm">Maps</span>
                            </a>
                        )}
                        {active.links?.youtube && (
                            <a
                                href={active.links.youtube}
                                target="_blank"
                                rel="noreferrer"
                                className="flex items-center gap-2 rounded-xl bg-rose-600 px-3 py-2 text-white hover:bg-rose-700"
                                title="Watch on YouTube"
                            >
                                <FaYoutube size={18} />
                                <span className="text-sm">YouTube</span>
                            </a>
                        )}
                        {active.links?.tiktok && (
                            <a
                                href={active.links.tiktok}
                                target="_blank"
                                rel="noreferrer"
                                className="flex items-center gap-2 rounded-xl bg-black px-3 py-2 text-white hover:bg-zinc-800"
                                title="View on TikTok"
                            >
                                <SiTiktok size={16} />
                                <span className="text-sm">TikTok</span>
                            </a>
                        )}
                        {active.links?.website && (
                            <a
                                href={active.links.website}
                                target="_blank"
                                rel="noreferrer"
                                className="flex items-center gap-2 rounded-xl bg-emerald-600 px-3 py-2 text-white hover:bg-emerald-700"
                                title="Open website"
                            >
                                <FiGlobe size={18} />
                                <span className="text-sm">Website</span>
                            </a>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
