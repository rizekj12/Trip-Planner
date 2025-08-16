// src/components/AddSpotModal.jsx
import React from 'react';
import { useState } from "react";
import { supabase } from "../utils/supabase";
import Modal from "./Modal";
import { gmaps } from "../utils/helpers";

/** Try to extract coords (and sometimes title) from a Google Maps URL */
function parseGoogleMapsLink(url) {
    if (!url) return { coords: null, titleHint: null };

    try {
        const u = new URL(url);

        // Case 1: .../@35.6895,139.6917,17z
        const at = u.pathname.match(/@(-?\d+\.?\d*),(-?\d+\.?\d*)/);
        if (at) {
            return { coords: [parseFloat(at[1]), parseFloat(at[2])], titleHint: null };
        }

        // Case 2: ...?q=35.6895,139.6917  OR  ...?query=35.6895,139.6917
        const q = u.searchParams.get("q") || u.searchParams.get("query");
        if (q) {
            const m = q.match(/(-?\d+\.?\d*)[, ]+(-?\d+\.?\d*)/);
            if (m) return { coords: [parseFloat(m[1]), parseFloat(m[2])], titleHint: null };
            // If it's not coords, it may be a text place name – return as title hint
            return { coords: null, titleHint: q };
        }

        // Case 3: /place/<name>/...
        const place = u.pathname.match(/\/place\/([^/]+)/);
        if (place) {
            const titleHint = decodeURIComponent(place[1]).replace(/\+/g, " ");
            return { coords: null, titleHint };
        }
    } catch {
        // ignore parse errors
    }
    return { coords: null, titleHint: null };
}

/** Optional: geocode if user provided address and link lacked coords */
async function geocode(address) {
    if (!address) return null;
    try {
        const url = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(address)}`;
        const res = await fetch(url, { headers: { Accept: "application/json" } });
        const data = await res.json();
        if (Array.isArray(data) && data[0]) {
            const { lat, lon } = data[0];
            return [parseFloat(lat), parseFloat(lon)];
        }
    } catch { }
    return null;
}

export default function AddSpotModal({ open, onClose, category }) {
    const [title, setTitle] = useState("");
    const [googleLink, setGoogleLink] = useState(""); // NEW (preferred)
    const [address, setAddress] = useState("");       // optional fallback
    const [region, setRegion] = useState("");         // Tokyo/Kyoto/Osaka/Nagoya
    const [img, setImg] = useState("");
    const [youtube, setYouTube] = useState("");
    const [tiktok, setTikTok] = useState("");
    const [website, setWebsite] = useState("");
    const [busy, setBusy] = useState(false);
    const [msg, setMsg] = useState("");

    async function submit(e) {
        e.preventDefault();
        setBusy(true); setMsg("");

        try {
            if (!title.trim()) {
                setMsg("Name of place is required.");
                setBusy(false);
                return;
            }

            // 1) Try to get coords/title from the Google Maps link
            const { coords: linkCoords, titleHint } = parseGoogleMapsLink(googleLink);

            // If no coords came from link, 2) try to geocode the address (if provided)
            const coords =
                linkCoords ||
                (address ? await geocode(address) : null);

            // Final “maps” link: prefer the user’s link; fallback to generated link
            const mapsLink = googleLink || gmaps(`${title} ${address || ""}`);

            const links = {
                youtube: youtube || undefined,
                tiktok: tiktok || undefined,
                website: website || undefined,
                maps: mapsLink,
            };

            const user = (await supabase.auth.getUser()).data.user;

            // Save in catalog_spots
            const { error } = await supabase.from("catalog_spots").insert({
                category,                   // "extras" | "food"
                title: title.trim() || titleHint || "Untitled Place",
                address: address || "",     // optional
                coords,                     // may be null -> no map marker until set
                region: region || null,
                img: img || null,
                links,
                created_by: user?.id || null,
            });
            if (error) throw error;

            // Reset and close
            setTitle(""); setGoogleLink(""); setAddress("");
            setRegion(""); setImg(""); setYouTube(""); setTikTok(""); setWebsite("");
            onClose?.();
        } catch (err) {
            setMsg(err.message || "Failed to add spot.");
        } finally {
            setBusy(false);
        }
    }

    return (
        <Modal open={open} onClose={onClose} theme={{ header: "bg-indigo-600 text-white" }}>
            <form onSubmit={submit} className="grid gap-3">
                <h3 className="text-lg font-semibold">Add a {category === "food" ? "Food spot" : "Thing to do"}</h3>

                {/* Required */}
                <div className="grid gap-1">
                    <label className="text-sm opacity-80">Name of place *</label>
                    <input
                        className="rounded-md px-3 py-2 text-zinc-900"
                        required
                        value={title}
                        onChange={(e) => setTitle(e.target.value)}
                        placeholder="e.g., Ghibli Park"
                    />
                </div>

                {/* Preferred */}
                <div className="grid gap-1">
                    <label className="text-sm opacity-80">Google Maps share link (preferred)</label>
                    <input
                        className="rounded-md px-3 py-2 text-zinc-900"
                        value={googleLink}
                        onChange={(e) => setGoogleLink(e.target.value)}
                        placeholder="Paste a link from the Share button in Google Maps"
                    />
                    <p className="text-xs opacity-70">Tip: Open Google Maps → search place → Share → Copy link → paste here.</p>
                </div>

                {/* Fallback */}
                <div className="grid gap-1">
                    <label className="text-sm opacity-80">Address (optional if link provided)</label>
                    <input
                        className="rounded-md px-3 py-2 text-zinc-900"
                        value={address}
                        onChange={(e) => setAddress(e.target.value)}
                        placeholder="123 Example St, City"
                    />
                </div>

                <div className="grid gap-1">
                    <label className="text-sm opacity-80">Region (Tokyo / Kyoto / Osaka / Nagoya)</label>
                    <input
                        className="rounded-md px-3 py-2 text-zinc-900"
                        value={region}
                        onChange={(e) => setRegion(e.target.value)}
                    />
                </div>

                <div className="grid gap-1">
                    <label className="text-sm opacity-80">Image URL (optional)</label>
                    <input
                        className="rounded-md px-3 py-2 text-zinc-900"
                        value={img}
                        onChange={(e) => setImg(e.target.value)}
                        placeholder="https://…"
                    />
                </div>

                {/* Optional links */}
                <div className="grid gap-1">
                    <label className="text-sm opacity-80">YouTube link (optional)</label>
                    <input
                        className="rounded-md px-3 py-2 text-zinc-900"
                        value={youtube}
                        onChange={(e) => setYouTube(e.target.value)}
                        placeholder="https://youtube.com/…"
                    />
                </div>
                <div className="grid gap-1">
                    <label className="text-sm opacity-80">TikTok link (optional)</label>
                    <input
                        className="rounded-md px-3 py-2 text-zinc-900"
                        value={tiktok}
                        onChange={(e) => setTikTok(e.target.value)}
                        placeholder="https://www.tiktok.com/@…"
                    />
                </div>
                <div className="grid gap-1">
                    <label className="text-sm opacity-80">Website (optional)</label>
                    <input
                        className="rounded-md px-3 py-2 text-zinc-900"
                        value={website}
                        onChange={(e) => setWebsite(e.target.value)}
                        placeholder="https://…"
                    />
                </div>

                {msg && <div className="rounded bg-white/30 p-2 text-sm text-zinc-900">{msg}</div>}

                <div className="mt-1 flex items-center justify-end gap-2">
                    <button type="button" onClick={onClose} className="rounded-md bg-zinc-600 px-3 py-2 text-white hover:bg-zinc-700">Cancel</button>
                    <button disabled={busy} className="rounded-md bg-indigo-600 px-3 py-2 text-white hover:bg-indigo-700 disabled:opacity-60">
                        {busy ? "Saving…" : "Add"}
                    </button>
                </div>
            </form>
        </Modal>
    );
}
