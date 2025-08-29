import React from 'react';
// src/components/HotelInfoModal.jsx
import { FaYoutube } from "react-icons/fa";
import { SiGooglemaps } from "react-icons/si";
import { FiX, FiGlobe, FiPhone, FiCalendar } from "react-icons/fi";

/**
 * Props:
 * - open: boolean
 * - onClose: () => void
 * - hotel: {
 *     title, region?, img?,
 *     links?: { maps?: string, youtube?: string, website?: string },
 *     note?, distanceLabel?,
 *     phone?, checkIn?, checkOut?
 *   }
 * - themeKey: "tokyo" | "kansai"
 */
export default function HotelInfoModal({ open, onClose, hotel, themeKey = "tokyo" }) {
    if (!open || !hotel) return null;

    const header =
        themeKey === "kansai" ? "bg-red-600 text-white" : "bg-indigo-600 text-white";

    const chip =
        themeKey === "kansai"
            ? "bg-red-200/90 text-red-900 ring-1 ring-red-300"
            : "bg-indigo-200/90 text-indigo-900 ring-1 ring-indigo-300";

    const imgSrc = hotel.img || "/hotel-fallback.jpg"; // optional fallback
    const hasDates = !!(hotel.checkIn || hotel.checkOut);
    const hasPhone = !!hotel.phone;

    return (
        <div
            className="fixed inset-0 z-[9999] flex items-center justify-center p-4"
            aria-modal="true"
            role="dialog"
        >
            {/* Backdrop */}
            <button
                className="absolute inset-0 bg-black/40 backdrop-blur-sm"
                onClick={onClose}
                aria-label="Close"
            />

            {/* Card */}
            <div className="relative z-10 w-full max-w-sm overflow-hidden rounded-2xl bg-white text-zinc-900 shadow-2xl ring-1 ring-black/10">
                {/* Header */}
                <div className={`flex items-center justify-between px-4 py-3 ${header}`}>
                    <div className="min-w-0">
                        <h2 className="truncate text-base font-semibold">{hotel.title}</h2>
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

                {/* Image */}
                <div className="aspect-video w-full bg-zinc-100">
                    {/* eslint-disable-next-line jsx-a11y/alt-text */}
                    <img
                        src={imgSrc}
                        alt={hotel.title}
                        className="h-full w-full object-cover"
                        onError={(e) => {
                            e.currentTarget.style.display = "none";
                        }}
                    />
                </div>

                {/* Body */}
                <div className="px-4 py-4 space-y-4">
                    {/* Dates (single chip) + optional distance/note */}
                    {(hasDates || hotel.distanceLabel || hotel.note) && (
                        <div className="flex flex-wrap items-center gap-2">
                            {hasDates && (
                                <span
                                    className={`inline-flex items-center gap-2 rounded-lg px-3 py-2 text-xs sm:text-sm font-medium shadow-sm ${chip}`}
                                >
                                    <FiCalendar className="opacity-80" />
                                    {hotel.checkIn && hotel.checkOut ? (
                                        <span className="truncate">
                                            {hotel.checkIn} → {hotel.checkOut}
                                        </span>
                                    ) : hotel.checkIn ? (
                                        <span className="truncate">Check-in: {hotel.checkIn}</span>
                                    ) : (
                                        <span className="truncate">Check-out: {hotel.checkOut}</span>
                                    )}
                                </span>
                            )}
                            {hotel.distanceLabel && (
                                <span className="inline-flex items-center gap-2 rounded-lg bg-zinc-100 px-2.5 py-1 text-[11px] sm:text-xs">
                                    {hotel.distanceLabel}
                                </span>
                            )}
                            {hotel.note && (
                                <span className="inline-flex items-center gap-2 rounded-lg bg-zinc-100 px-2.5 py-1 text-[11px] sm:text-xs">
                                    {hotel.note}
                                </span>
                            )}
                        </div>
                    )}

                    {/* Primary actions: equal width, aligned */}
                    <div className="flex flex-wrap gap-3">
                        {hasPhone && (
                            <a
                                href={`tel:${hotel.phone.replace(/\s+/g, "")}`}
                                className="flex-1 min-w-[120px] inline-flex items-center justify-center gap-2 rounded-lg bg-emerald-600 px-3 py-2 text-sm font-semibold text-white hover:bg-emerald-700"
                                title={`Call ${hotel.phone}`}
                            >
                                <FiPhone />
                                Call
                            </a>
                        )}
                        {hotel.links?.maps && (
                            <a
                                href={hotel.links.maps}
                                target="_blank"
                                rel="noreferrer"
                                className="flex-1 min-w-[120px] inline-flex items-center justify-center gap-2 rounded-lg bg-indigo-600 px-3 py-2 text-sm font-semibold text-white hover:bg-indigo-700"
                                title="Open in Google Maps"
                            >
                                <SiGooglemaps size={18} />
                                Maps
                            </a>
                        )}
                        {hotel.links?.website && (
                            <a
                                href={hotel.links.website}
                                target="_blank"
                                rel="noreferrer"
                                className="flex-1 min-w-[120px] inline-flex items-center justify-center gap-2 rounded-lg bg-emerald-600 px-3 py-2 text-sm font-semibold text-white hover:bg-emerald-700"
                                title="Open website"
                            >
                                <FiGlobe size={18} />
                                Website
                            </a>
                        )}
                    </div>

                    {/* Secondary links row (optional) */}
                    {hotel.links?.youtube && (
                        <div className="pt-1">
                            <a
                                href={hotel.links.youtube}
                                target="_blank"
                                rel="noreferrer"
                                className="inline-flex items-center gap-2 rounded-lg bg-rose-600 px-3 py-2 text-sm font-semibold text-white hover:bg-rose-700"
                                title="Watch on YouTube"
                            >
                                <FaYoutube size={18} />
                                YouTube
                            </a>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
