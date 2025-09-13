import React from 'react';
import { useEffect, useMemo, useState } from "react";
import { supabase } from "../utils/supabase";
import Modal from "./Modal";
import { gmaps } from "../utils/helpers";

/** Extract coords or a title hint from a Google Maps URL */
function parseGoogleMapsLink(url) {
    if (!url || typeof url !== "string") return { coords: null, titleHint: null };
    try {
        const trimmed = url.trim();
        if (!/^https?:\/\//i.test(trimmed)) return { coords: null, titleHint: null };
        const u = new URL(trimmed);

        // Case 1: …/@35.6895,139.6917
        const at = u.pathname.match(/@(-?\d+\.?\d*),(-?\d+\.?\d*)/);
        if (at) return { coords: [parseFloat(at[1]), parseFloat(at[2])], titleHint: null };

        // Case 2: ?q=lat,lon or ?query=lat,lon
        const q = u.searchParams.get("q") || u.searchParams.get("query");
        if (q) {
            const m = q.match(/(-?\d+\.?\d*)[, ]+(-?\d+\.?\d*)/);
            if (m) return { coords: [parseFloat(m[1]), parseFloat(m[2])], titleHint: null };
            return { coords: null, titleHint: q };
        }

        // Case 3: /place/<name>
        const place = u.pathname.match(/\/place\/([^/]+)/);
        if (place) {
            return { coords: null, titleHint: decodeURIComponent(place[1]).replace(/\+/g, " ") };
        }
    } catch {
        // ignore bad input
    }
    return { coords: null, titleHint: null };
}

async function geocode(address) {
    if (!address) return null;
    try {
        const url = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(address)}`;
        const res = await fetch(url);
        const data = await res.json();
        if (Array.isArray(data) && data[0]) {
            return [parseFloat(data[0].lat), parseFloat(data[0].lon)];
        }
    } catch { }
    return null;
}

export default function AddSpotModal({ open, onClose, theme, ...props }) {
    // safe default theme so theme.card etc. can't be read from undefined
    const th = theme || {
        card: "bg-white",
        header: "bg-zinc-100",
        markerColor: "#4f46e5",
        overlayScrim: "bg-black/40",
    };

    const [title, setTitle] = useState("");
    const [googleLink, setGoogleLink] = useState("");
    const [address, setAddress] = useState("");
    const [region, setRegion] = useState("");
    const [img, setImg] = useState("");
    const [youtube, setYouTube] = useState("");
    const [tiktok, setTikTok] = useState("");
    const [website, setWebsite] = useState("");
    const [busy, setBusy] = useState(false);
    const [msg, setMsg] = useState("");
    const [previewCoords, setPreviewCoords] = useState(null);

    useEffect(() => {
        const { coords } = parseGoogleMapsLink(googleLink);
        setPreviewCoords(coords || null);
    }, [googleLink]);

    const coordsLabel = useMemo(() => {
        if (previewCoords) return `${previewCoords[0].toFixed(5)}, ${previewCoords[1].toFixed(5)} (from Maps link)`;
        return address ? "Will try to geocode the address" : "No map location yet (you can set it later)";
    }, [previewCoords, address]);

    async function submit(e) {
        e.preventDefault();
        setBusy(true); setMsg("");
        try {
            if (!title.trim()) throw new Error("Name of place is required.");
            const { coords: linkCoords, titleHint } = parseGoogleMapsLink(googleLink);
            const coords = linkCoords || (address ? await geocode(address) : null);
            const mapsLink = googleLink || gmaps(`${title} ${address || ""}`);
            const user = (await supabase.auth.getUser()).data.user;

            const { error } = await supabase.from("catalog_spots").insert({
                category,
                title: title.trim() || titleHint || "Untitled Place",
                address: address || "",
                coords,
                region: region || null,
                img: img || null,
                links: {
                    maps: mapsLink,
                    youtube: youtube || undefined,
                    tiktok: tiktok || undefined,
                    website: website || undefined,
                },
                created_by: user?.id || null,
            });
            if (error) throw error;

            // reset after save
            setTitle(""); setGoogleLink(""); setAddress(""); setRegion("");
            setImg(""); setYouTube(""); setTikTok(""); setWebsite(""); setPreviewCoords(null);
            onClose?.();
        } catch (err) {
            setMsg(err.message || "Failed to add spot.");
        } finally {
            setBusy(false);
        }
    }

    return (
        <Modal open={open} onClose={onClose}>
            <div className="p-6 rounded-xl bg-white/90 text-black">
                <h3 className="text-lg font-semibold mb-4">Add Spot</h3>

                <form onSubmit={submit} className="grid gap-4">
                    {/* Name */}
                    <div className="grid gap-1">
                        <label className="text-sm font-medium">Name *</label>
                        <input className="rounded-md px-3 py-2 text-zinc-900" required
                            value={title} onChange={(e) => setTitle(e.target.value)}
                            placeholder="e.g., Ghibli Park" />
                    </div>

                    {/* Location section */}
                    <div className="grid gap-2 rounded-xl bg-white/40 p-3 text-zinc-900">
                        <div className="text-sm font-medium">Location</div>
                        <label className="text-xs opacity-80">Google Maps share link (preferred)</label>
                        <input className="rounded-md px-3 py-2 text-zinc-900"
                            value={googleLink} onChange={(e) => setGoogleLink(e.target.value)}
                            placeholder="Paste link from Google Maps → Share → Copy link" />
                        <div className="text-[11px] opacity-75">Detected: {coordsLabel}</div>

                        <label className="text-xs opacity-80 mt-2">Address (optional if link provided)</label>
                        <input className="rounded-md px-3 py-2 text-zinc-900"
                            value={address} onChange={(e) => setAddress(e.target.value)}
                            placeholder="123 Example St, City" />

                        <label className="text-xs opacity-80 mt-2">Region (Tokyo / Kyoto / Osaka / Nagoya)</label>
                        <input className="rounded-md px-3 py-2 text-zinc-900"
                            value={region} onChange={(e) => setRegion(e.target.value)} />
                    </div>

                    {/* Media + links */}
                    <div className="grid gap-2 rounded-xl bg-white/40 p-3 text-zinc-900">
                        <div className="text-sm font-medium">Media & Links (optional)</div>
                        <input className="rounded-md px-3 py-2 text-zinc-900" value={img}
                            onChange={(e) => setImg(e.target.value)} placeholder="Image URL" />
                        <input className="rounded-md px-3 py-2 text-zinc-900" value={youtube}
                            onChange={(e) => setYouTube(e.target.value)} placeholder="YouTube link" />
                        <input className="rounded-md px-3 py-2 text-zinc-900" value={tiktok}
                            onChange={(e) => setTikTok(e.target.value)} placeholder="TikTok link" />
                        <input className="rounded-md px-3 py-2 text-zinc-900" value={website}
                            onChange={(e) => setWebsite(e.target.value)} placeholder="Website" />
                    </div>

                    {msg && <div className="rounded bg-rose-100 px-3 py-2 text-sm text-rose-700">{msg}</div>}

                    <div className="mt-1 flex items-center justify-end gap-2">
                        <button type="button" onClick={onClose}
                            className="rounded-md bg-zinc-600 px-3 py-2 text-white hover:bg-zinc-700">
                            Cancel
                        </button>
                        <button disabled={busy}
                            className="rounded-md bg-indigo-600 px-3 py-2 text-white hover:bg-indigo-700 disabled:opacity-60">
                            {busy ? "Saving…" : "Add"}
                        </button>
                    </div>
                </form>
            </div>
        </Modal>
    );
}
