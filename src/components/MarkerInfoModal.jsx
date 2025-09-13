import React from "react";
import { gmaps, yt } from "../utils/helpers";

export default function MarkerInfoModal({ open, onClose, active }) {
    if (!open || !active) return null;

    const title = active.title || "Location";
    const coords = Array.isArray(active.coords) ? `${active.coords[0]},${active.coords[1]}` : null;
    const details = active.description || active.snippet || active.note || "";
    const img = active.img || active.image || null;

    const mapsUrl = coords ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(coords)}` : gmaps(title);
    const ytUrl = yt(title);

    return (
        <div className="fixed inset-0 z-[10000] flex items-center justify-center">
            <div className="absolute inset-0 bg-black/40" onClick={onClose} />

            <div className="relative w-full max-w-sm mx-4 rounded-xl overflow-hidden shadow-lg bg-white/80 text-black backdrop-blur-sm">
                <div className="flex items-center gap-3 p-3">
                    {img ? (
                        <img src={img} alt={title} className="h-12 w-16 object-cover rounded-md flex-none" />
                    ) : (
                        <div className="h-12 w-16 flex-none rounded-md bg-zinc-100 grid place-items-center text-lg">📍</div>
                    )}

                    <div className="flex-1 min-w-0">
                        <div className="text-sm font-semibold truncate">{title}</div>
                        {coords && <div className="text-xs text-zinc-600 truncate mt-0.5">{coords}</div>}
                        {details ? <div className="text-xs text-zinc-700 mt-1 line-clamp-3">{details}</div> : null}
                    </div>

                    <button
                        onClick={onClose}
                        className="ml-2 rounded-full p-1 text-zinc-600 hover:bg-zinc-100"
                        aria-label="Close"
                    >
                        ✕
                    </button>
                </div>

                <div className="p-3 border-t border-black/10">
                    <div className="flex items-center justify-center gap-4">
                        <a
                            href={mapsUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="w-10 h-10 rounded-full bg-indigo-600 inline-flex items-center justify-center shadow-sm hover:bg-indigo-700"
                            aria-label="Open in Maps"
                        >
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden focusable="false">
                                <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7z" fill="#fff" />
                                <circle cx="12" cy="9" r="1.8" fill="#e0e7ff" />
                            </svg>
                        </a>

                        <a
                            href={ytUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="w-10 h-10 rounded-full bg-red-600 inline-flex items-center justify-center shadow-sm hover:bg-red-700"
                            aria-label="Open on YouTube"
                        >
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden focusable="false">
                                <path d="M23.5 6.2s-.2-1.7-.8-2.4c-.8-.8-1.7-.8-2.1-.9C16.9 2.5 12 2.5 12 2.5s-4.9 0-8.6.4c-.4 0-1.3.1-2.1.9-.6.7-.8 2.4-.8 2.4S0 8 0 9.8v2.4C0 14 0.2 15.7.2 15.7s.2 1.7.8 2.4c.8.8 1.8.8 2.3.9 1.7.1 7.2.4 7.2.4s4.9 0 8.6-.4c.4 0 1.3-.1 2.1-.9.6-.7.8-2.4.8-2.4s.2-1.7.2-3.5V9.8c0-1.8-.2-3.6-.2-3.6z" fill="#fff" />
                                <path d="M9.8 15.1V8.5l6.3 3.3-6.3 3.3z" fill="#ff0000" />
                            </svg>
                        </a>
                    </div>

                    {active.links && (Array.isArray(active.links) ? active.links : Object.values(active.links)).length > 0 && (
                        <div className="mt-3 flex gap-2 justify-center flex-wrap">
                            {(Array.isArray(active.links) ? active.links : Object.values(active.links)).slice(0, 3).map((l, i) => (
                                <a
                                    key={i}
                                    href={l.url || l}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="text-xs underline text-zinc-700"
                                >
                                    {l.label || (typeof l === "string" ? l : l.url) || "Link"}
                                </a>
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
