import React, { useEffect, useMemo, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, X, ChevronDown, Loader2, MapPin, SearchX } from 'lucide-react';
import { searchHotels } from '../../utils/hotelSearch';

const ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('');

function LetterFilter({ letter, onSelect }) {
    const [open, setOpen] = useState(false);
    const ref = useRef(null);

    useEffect(() => {
        const handler = (e) => {
            if (ref.current && !ref.current.contains(e.target)) setOpen(false);
        };
        document.addEventListener('mousedown', handler);
        return () => document.removeEventListener('mousedown', handler);
    }, []);

    return (
        <div ref={ref} className="relative flex-shrink-0">
            <button
                type="button"
                onClick={() => setOpen((o) => !o)}
                className="h-full flex items-center gap-1 px-3 py-3 border-2 border-gray-200 rounded-lg text-sm font-medium text-gray-700 hover:border-indigo-300 transition-colors"
            >
                {letter || 'A-Z'}
                <ChevronDown size={14} />
            </button>

            {open && (
                <div className="absolute right-0 mt-1 w-56 bg-white rounded-xl shadow-xl border border-gray-100 p-2 z-50 grid grid-cols-6 gap-1">
                    <button
                        onClick={() => { onSelect(null); setOpen(false); }}
                        className={`col-span-6 text-left px-2 py-1.5 rounded-lg text-sm font-medium ${!letter ? 'bg-indigo-100 text-indigo-700' : 'text-gray-600 hover:bg-gray-50'}`}
                    >
                        All letters
                    </button>
                    {ALPHABET.map((l) => (
                        <button
                            key={l}
                            onClick={() => { onSelect(l); setOpen(false); }}
                            className={`w-8 h-8 rounded-lg text-sm font-medium ${letter === l ? 'bg-indigo-100 text-indigo-700' : 'text-gray-600 hover:bg-gray-50'}`}
                        >
                            {l}
                        </button>
                    ))}
                </div>
            )}
        </div>
    );
}

export default function HotelSearchModal({ city, country, onSelect, onClose }) {
    const [hotels, setHotels] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [query, setQuery] = useState('');
    const [letter, setLetter] = useState(null);

    useEffect(() => {
        let cancelled = false;
        setLoading(true);
        setError(null);

        searchHotels(city, country)
            .then((results) => { if (!cancelled) setHotels(results); })
            .catch((err) => { if (!cancelled) setError(err.message); })
            .finally(() => { if (!cancelled) setLoading(false); });

        return () => { cancelled = true; };
    }, [city, country]);

    const filteredHotels = useMemo(() => {
        return hotels.filter((h) => {
            const matchesQuery = query.trim()
                ? h.name.toLowerCase().includes(query.trim().toLowerCase())
                : true;
            const matchesLetter = letter
                ? h.name.trim()[0]?.toUpperCase() === letter
                : true;
            return matchesQuery && matchesLetter;
        });
    }, [hotels, query, letter]);

    return (
        <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 px-4"
            onClick={onClose}
        >
            <motion.div
                initial={{ opacity: 0, scale: 0.95, y: 10 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: 10 }}
                onClick={(e) => e.stopPropagation()}
                className="bg-white rounded-2xl shadow-2xl max-w-lg w-full max-h-[80vh] flex flex-col"
            >
                {/* Header */}
                <div className="flex items-center justify-between px-6 pt-6 pb-4">
                    <div>
                        <h3 className="text-lg font-bold text-gray-900">Search Hotels</h3>
                        <p className="text-sm text-gray-500">{city}{country ? `, ${country}` : ''}</p>
                    </div>
                    <button
                        onClick={onClose}
                        className="text-gray-400 hover:text-gray-600 transition-colors"
                        aria-label="Close"
                    >
                        <X size={20} />
                    </button>
                </div>

                {/* Search + letter filter */}
                <div className="px-6 pb-4 flex gap-2">
                    <div className="relative flex-1">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                        <input
                            type="text"
                            value={query}
                            onChange={(e) => setQuery(e.target.value)}
                            placeholder="Type a hotel name…"
                            className="w-full pl-10 pr-4 py-3 border-2 border-gray-200 rounded-lg focus:border-indigo-500 focus:outline-none"
                        />
                    </div>
                    <LetterFilter letter={letter} onSelect={setLetter} />
                </div>

                {/* Results */}
                <div className="flex-1 overflow-y-auto px-6 pb-6 space-y-2">
                    {loading && (
                        <div className="flex flex-col items-center justify-center py-12 text-gray-500 gap-2">
                            <Loader2 className="animate-spin" size={24} />
                            <p className="text-sm">Searching hotels…</p>
                        </div>
                    )}

                    {!loading && error && (
                        <div className="flex flex-col items-center justify-center py-12 text-gray-500 gap-2 text-center">
                            <SearchX size={24} />
                            <p className="text-sm">{error}</p>
                        </div>
                    )}

                    {!loading && !error && hotels.length === 0 && (
                        <div className="flex flex-col items-center justify-center py-12 text-gray-500 gap-2 text-center">
                            <SearchX size={24} />
                            <p className="text-sm font-medium">Can't find hotels in this area</p>
                        </div>
                    )}

                    {!loading && !error && hotels.length > 0 && filteredHotels.length === 0 && (
                        <div className="flex flex-col items-center justify-center py-12 text-gray-500 gap-2 text-center">
                            <SearchX size={24} />
                            <p className="text-sm">No hotels match your search</p>
                        </div>
                    )}

                    {!loading && !error && filteredHotels.map((hotel, i) => (
                        <button
                            key={`${hotel.name}-${i}`}
                            onClick={() => onSelect(hotel)}
                            className="w-full text-left px-4 py-3 border-2 border-gray-100 rounded-xl hover:border-indigo-300 hover:bg-indigo-50/50 transition-colors flex items-start gap-3"
                        >
                            <MapPin className="text-indigo-500 flex-shrink-0 mt-0.5" size={16} />
                            <div className="min-w-0">
                                <p className="font-medium text-gray-900 truncate">{hotel.name}</p>
                                <p className="text-sm text-gray-500 truncate">{hotel.address}</p>
                            </div>
                        </button>
                    ))}
                </div>
            </motion.div>
        </motion.div>
    );
}
