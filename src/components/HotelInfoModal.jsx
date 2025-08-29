import React from 'react';
// src/components/HotelInfoModal.jsx
import { FaYoutube } from "react-icons/fa";
import { SiGooglemaps } from "react-icons/si";
import { FiX, FiGlobe } from "react-icons/fi";

/**
 * Props:
 * - open: boolean
 * - onClose: () => void
 * - hotel: { title, region?, img?, links?: { maps?, youtube?, website? }, note?, distanceLabel? }
 * - themeKey: "tokyo" | "kansai"
 */
export default function HotelInfoModal({ open, onClose, hotel, themeKey = "tokyo" }) {
    if (!open || !hotel) return null;

    const header =
        themeKey === "kansai"
            ? "bg-red-600 text-white"
            : "bg-indigo-600 text-white";

    const chip =
        themeKey === "kansai"
            ? "bg-red-200/80 text-red-900"
            : "bg-indigo-200/80 text-indigo-900";

    // image fallback (local or remote)
    const imgSrc =
        hotel.img ||
        "/hotel-fallback.jpg"; // optional: add a fallback image in /public

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
                        <div className="truncate text-base font-semibold">{hotel.title}</div>
                        {hotel.region && (
                            <div className="mt-0.5 text-xs opacity-90">{hotel.region}</div>
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

                {/* image */}
                <div className="aspect-video w-full bg-zinc-100">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                        src={imgSrc}
                        alt={hotel.title}
                        className="h-full w-full object-cover"
                        onError={(e) => {
                            // if custom image fails, swap to a neutral fallback color
                            e.currentTarget.style.display = "none";
                        }}
                    />
                </div>

                {/* body */}
                <div className="px-4 py-4">
                    {/* chips */}
                    <div className="mb-3 flex flex-wrap gap-2">
                        {hotel.distanceLabel && (
                            <span className={`rounded-full px-2.5 py-1 text-xs font-medium ${chip}`}>
                                {hotel.distanceLabel}
                            </span>
                        )}
                        {hotel.note && (
                            <span className="rounded-full bg-zinc-100 px-2.5 py-1 text-xs">
                                {hotel.note}
                            </span>
                        )}
                    </div>

                    {/* links */}
                    <div className="flex flex-wrap gap-3">
                        {hotel.links?.maps && (
                            <a
                                href={hotel.links.maps}
                                target="_blank"
                                rel="noreferrer"
                                className="flex items-center gap-2 rounded-xl bg-indigo-600 px-3 py-2 text-white hover:bg-indigo-700"
                                title="Open in Google Maps"
                            >
                                <SiGooglemaps size={18} />
                                <span className="text-sm">Maps</span>
                            </a>
                        )}
                        {hotel.links?.youtube && (
                            <a
                                href={hotel.links.youtube}
                                target="_blank"
                                rel="noreferrer"
                                className="flex items-center gap-2 rounded-xl bg-rose-600 px-3 py-2 text-white hover:bg-rose-700"
                                title="Watch on YouTube"
                            >
                                <FaYoutube size={18} />
                                <span className="text-sm">YouTube</span>
                            </a>
                        )}
                        {hotel.links?.website && (
                            <a
                                href={hotel.links.website}
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
