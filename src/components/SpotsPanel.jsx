import React from 'react';
import { useMemo, useState, useEffect } from "react";
import DayMap from "./DayMap";
import TodayStopsList from "./TodayStopsList";
import AddSpotModal from "./AddSpotModal";
import EditCoordsModal from "./EditCoordsModal";
import ConfirmDialog from "./ConfirmDialog";
import { useCatalog } from "../hooks/useCatalog";
import { updateCatalogSpot, deleteCatalogSpot } from "../utils/db";
import { supabase } from "../utils/supabase";
import { FiTrash2 } from "react-icons/fi";

export default function SpotsPanel({ items = [], theme, title = "List", category }) {
    const [session, setSession] = useState(null);
    useEffect(() => {
        supabase.auth.getSession().then(({ data }) => setSession(data.session));
        const { data: sub } = supabase.auth.onAuthStateChange((_e, s) => setSession(s));
        return () => sub.subscription.unsubscribe();
    }, []);
    const myId = session?.user?.id;

    const catalog = useCatalog(category); // DB items
    const combined = useMemo(() => [...catalog, ...items], [catalog, items]);

    const allRegions = useMemo(() => {
        const set = new Set(combined.map((i) => i.region).filter(Boolean));
        return Array.from(set);
    }, [combined]);

    const [regions, setRegions] = useState([]);
    const [q, setQ] = useState("");
    const [openAdd, setOpenAdd] = useState(false);
    const [editing, setEditing] = useState(null);

    // delete state
    const [toDelete, setToDelete] = useState(null);
    const [deleteMsg, setDeleteMsg] = useState("");

    const toggleRegion = (r) => {
        setRegions((prev) => (prev.includes(r) ? prev.filter((x) => x !== r) : [...prev, r]));
    };

    const filtered = useMemo(() => {
        const rx = q.trim().toLowerCase();
        return combined.filter((i) => {
            const regionPass = regions.length === 0 || (i.region && regions.includes(i.region));
            if (!regionPass) return false;
            if (!rx) return true;
            return i.title.toLowerCase().includes(rx);
        });
    }, [combined, regions, q]);

    const mapItems = filtered.filter((s) => Array.isArray(s.coords));

    async function saveCoords(latlng) {
        if (!editing?.id) return;
        await updateCatalogSpot(editing.id, { coords: latlng });
        setEditing(null);
    }

    async function confirmDelete() {
        if (!toDelete?.id) return;
        setDeleteMsg("");
        const { error } = await deleteCatalogSpot(toDelete.id);
        if (error) setDeleteMsg(error.message || "Failed to delete.");
        else setToDelete(null);
    }

    return (
        <>
            <div className="grid grid-cols-1 gap-6 md:grid-cols-5">
                <div className="md:col-span-3">
                    <DayMap items={mapItems} theme={theme} />
                </div>

                <div className="md:col-span-2">
                    <div className={`rounded-2xl p-6 shadow-xl ${theme.card}`}>
                        <div className={`mb-3 flex items-center justify-between rounded-xl p-3 ${theme.header}`}>
                            <h2 className="text-xl font-semibold">{title}</h2>
                            <div className="flex items-center gap-2">
                                {(regions.length > 0 || q) && (
                                    <button
                                        onClick={() => { setRegions([]); setQ(""); }}
                                        className="rounded-full bg-white/20 px-3 py-1 text-xs text-white hover:bg-white/30"
                                    >
                                        Clear
                                    </button>
                                )}
                                <button
                                    onClick={() => setOpenAdd(true)}
                                    className="rounded-full bg-white/90 px-3 py-1 text-sm font-semibold text-zinc-900 hover:bg-white"
                                    title="Add a place"
                                >
                                    + Add
                                </button>
                            </div>
                        </div>

                        {/* Filters */}
                        <div className="mb-3 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                            <div className="flex flex-wrap gap-2">
                                <button
                                    onClick={() => setRegions([])}
                                    className={["rounded-full px-3 py-1 text-sm transition", regions.length === 0 ? "bg-white/90 text-zinc-900 shadow" : "bg-white/30 text-white hover:bg-white/40"].join(" ")}
                                    aria-pressed={regions.length === 0}
                                >
                                    All
                                </button>
                                {allRegions.map((r) => {
                                    const active = regions.includes(r);
                                    return (
                                        <button
                                            key={r}
                                            onClick={() => toggleRegion(r)}
                                            className={["rounded-full px-3 py-1 text-sm transition", active ? "bg-white/90 text-zinc-900 shadow" : "bg-white/30 text-white hover:bg-white/40"].join(" ")}
                                            aria-pressed={active}
                                        >
                                            {r}
                                        </button>
                                    );
                                })}
                            </div>

                            <div className="relative">
                                <input
                                    value={q}
                                    onChange={(e) => setQ(e.target.value)}
                                    placeholder="Search places…"
                                    className="w-full rounded-lg bg-white/85 px-3 py-2 text-sm text-zinc-900 placeholder-zinc-500 shadow focus:outline-none focus:ring-2 focus:ring-white/70 sm:w-64"
                                    aria-label="Search places"
                                />
                            </div>
                        </div>

                        {/* Numbered list */}
                        <div className="max-h-[420px] overflow-auto pr-1">
                            {filtered.length === 0 ? (
                                <div className="rounded-lg bg-white/40 p-3 text-sm text-zinc-900">No matches. Try removing filters.</div>
                            ) : (
                                <ul className={`rounded-xl p-3 ${theme.sub}`}>
                                    <div className="mb-2 font-medium">Pick a place</div>
                                    {filtered.map((spot, i) => {
                                        const isCatalog = !!spot.id;
                                        const needsCoords = !Array.isArray(spot.coords);
                                        const isOwner = isCatalog && myId && spot.created_by === myId; // only show delete if creator

                                        return (
                                            <li key={(spot.id || spot.title) + i} className="flex items-center gap-3 py-2">
                                                <span
                                                    className="inline-flex h-6 w-6 flex-none items-center justify-center rounded-full text-xs font-bold text-white"
                                                    style={{ backgroundColor: theme.markerColor }}
                                                >
                                                    {i + 1}
                                                </span>
                                                <div className="min-w-0 flex-1">
                                                    <div className="truncate font-medium">{spot.title}</div>
                                                    <div className="text-xs opacity-70">
                                                        {spot.region || "—"}
                                                        {needsCoords && isCatalog && <span className="ml-2 rounded bg-amber-300/80 px-1.5 py-0.5 text-[10px] text-black">location needed</span>}
                                                    </div>
                                                </div>
                                                {isCatalog && (
                                                    <div className="flex items-center gap-2">
                                                        <button
                                                            onClick={() => setEditing(spot)}
                                                            className={`rounded-md px-2 py-1 text-xs ${needsCoords ? "bg-amber-500 text-black hover:bg-amber-400" : "bg-white/85 text-zinc-900 hover:bg-white"
                                                                }`}
                                                            title="Set or adjust map location"
                                                        >
                                                            {needsCoords ? "Set location" : "Edit location"}
                                                        </button>
                                                        {isOwner && (
                                                            <button
                                                                onClick={() => setToDelete(spot)}
                                                                className="rounded-md bg-rose-600 px-2 py-1 text-xs text-white hover:bg-rose-700"
                                                                title="Delete (only creator can delete)"
                                                            >
                                                                <FiTrash2 />
                                                            </button>
                                                        )}
                                                    </div>
                                                )}
                                            </li>
                                        );
                                    })}
                                </ul>
                            )}
                        </div>
                    </div>
                </div>
            </div>

            {/* Modals */}
            <AddSpotModal open={openAdd} onClose={() => setOpenAdd(false)} category={category} />
            <EditCoordsModal open={!!editing} onClose={() => setEditing(null)} item={editing} onSave={saveCoords} />

            <ConfirmDialog
                open={!!toDelete}
                onClose={() => setToDelete(null)}
                title="Delete this place?"
                message={toDelete ? `“${toDelete.title}” will be removed for everyone. This cannot be undone.` : ""}
                confirmText="Delete"
                onConfirm={confirmDelete}
            />
            {deleteMsg && (
                <div className="fixed bottom-4 left-1/2 z-[9999] -translate-x-1/2 rounded-lg bg-rose-700 px-3 py-2 text-sm text-white shadow">
                    {deleteMsg}
                </div>
            )}
        </>
    );
}
