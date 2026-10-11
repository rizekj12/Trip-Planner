import React, { useEffect, useMemo, useState } from 'react';
import { MapPin } from 'lucide-react';
import { COUNTRIES, DESTINATION_ALIASES } from '../../data/countriesAndCities';
import { getCountryFlagOnly } from '../../utils/countryFlags';

const MAX_SUGGESTIONS = 8;

// Lowercase, strip accents and periods: "Curaçao" -> "curacao", "U.S." -> "us"
const normalize = (s) =>
    s.normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/\./g, '').toLowerCase().trim();

const SEARCHABLE = COUNTRIES.map((name) => ({
    name,
    terms: [normalize(name), ...(DESTINATION_ALIASES[name] || []).map(normalize)],
}));

// Best matches first: exact, then starts-with, then a word starts with it, then (for 3+
// letters, so "pu" doesn't match "Republic") anywhere in the name
function rank(terms, q) {
    let best = Infinity;
    for (const t of terms) {
        if (t === q) best = Math.min(best, 0);
        else if (t.startsWith(q)) best = Math.min(best, 1);
        else if (t.split(/[\s-]+/).some((w) => w.startsWith(q))) best = Math.min(best, 2);
        else if (q.length >= 3 && t.includes(q)) best = Math.min(best, 3);
    }
    return best;
}

function search(query) {
    const q = normalize(query);
    if (!q) return [];
    return SEARCHABLE.map((d) => ({ name: d.name, score: rank(d.terms, q) }))
        .filter((d) => d.score < Infinity)
        .sort((a, b) => a.score - b.score || a.name.localeCompare(b.name))
        .slice(0, MAX_SUGGESTIONS)
        .map((d) => d.name);
}

function exactMatch(query) {
    const q = normalize(query);
    return q ? SEARCHABLE.find((d) => d.terms.includes(q))?.name ?? null : null;
}

function Flag({ name }) {
    const flag = getCountryFlagOnly(name);
    // Countries without a known flag get a pin instead of the generic ✈️ fallback
    return flag === '✈️'
        ? <MapPin size={16} className="text-gray-400" />
        : <span className="text-lg leading-none">{flag}</span>;
}

// Type-to-search destination field. Only destinations in the list can be chosen:
// onChange is called with a destination name, and only when the choice changes.
export default function DestinationPicker({ value, onChange }) {
    const [query, setQuery] = useState(value || '');
    const [open, setOpen] = useState(false);
    const [highlight, setHighlight] = useState(0);
    const suggestions = useMemo(() => search(query), [query]);

    // Keep the text in sync when the selection changes (e.g. a saved draft loads)
    useEffect(() => { setQuery(value || ''); }, [value]);

    const choose = (name) => {
        setQuery(name);
        setOpen(false);
        if (name !== value) onChange(name);
    };

    // Leaving the field: accept an exact match, otherwise go back to the current choice
    const settle = () => {
        setOpen(false);
        const match = exactMatch(query);
        if (match) choose(match);
        else setQuery(value || '');
    };

    const onKeyDown = (e) => {
        if (e.key === 'ArrowDown') {
            e.preventDefault();
            setOpen(true);
            setHighlight((h) => Math.min(h + 1, suggestions.length - 1));
        } else if (e.key === 'ArrowUp') {
            e.preventDefault();
            setHighlight((h) => Math.max(h - 1, 0));
        } else if (e.key === 'Enter') {
            e.preventDefault();
            if (open && suggestions[highlight]) choose(suggestions[highlight]);
            else settle();
        } else if (e.key === 'Escape') {
            setOpen(false);
            setQuery(value || '');
        }
    };

    const showList = open && query.trim() && normalize(query) !== normalize(value || '');

    return (
        <div className="relative">
            <div className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none">
                {value && normalize(query) === normalize(value)
                    ? <Flag name={value} />
                    : <MapPin size={20} className="text-gray-400" />}
            </div>
            <input
                type="text"
                role="combobox"
                aria-expanded={!!showList}
                aria-controls="destination-options"
                aria-autocomplete="list"
                autoComplete="off"
                value={query}
                onChange={(e) => { setQuery(e.target.value); setOpen(true); setHighlight(0); }}
                onFocus={(e) => e.target.select()}
                onBlur={settle}
                onKeyDown={onKeyDown}
                placeholder="Start typing a country or territory…"
                className="w-full pl-10 pr-4 py-3 border-2 border-gray-200 rounded-xl focus:border-indigo-500 focus:outline-none transition-colors bg-white text-gray-900"
            />

            {showList && (
                <ul
                    id="destination-options"
                    role="listbox"
                    className="absolute z-50 mt-1 w-full max-h-72 overflow-y-auto rounded-xl border border-gray-200 bg-white py-1 shadow-xl"
                >
                    {suggestions.length ? (
                        suggestions.map((name, i) => (
                            <li
                                key={name}
                                role="option"
                                aria-selected={i === highlight}
                                // mousedown (not click) so it fires before the input's blur
                                onMouseDown={(e) => { e.preventDefault(); choose(name); }}
                                onMouseEnter={() => setHighlight(i)}
                                className={`flex cursor-pointer items-center gap-3 px-4 py-2.5 text-sm ${
                                    i === highlight ? 'bg-indigo-50 text-indigo-700' : 'text-gray-800'
                                }`}
                            >
                                <span className="flex w-6 justify-center"><Flag name={name} /></span>
                                {name}
                            </li>
                        ))
                    ) : (
                        <li className="px-4 py-3 text-sm text-gray-500">No matching destinations</li>
                    )}
                </ul>
            )}
        </div>
    );
}
