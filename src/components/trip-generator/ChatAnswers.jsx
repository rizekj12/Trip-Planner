import React, { useState } from 'react';
import { Send, Search, Loader2, Plane, X, Plus } from 'lucide-react';
import DestinationPicker from './DestinationPicker';
import HotelSearchModal from './HotelSearchModal';
import { Stepper } from './PreferenceInputs';
import TimeSelect from '../TimeSelect';
import { FlightFields } from '../reservations/ReservationFields';
import { CITIES_BY_COUNTRY } from '../../data/countriesAndCities';
import { validateAddress } from '../../utils/addressValidation';
import { BLANK_FLIGHT, newReservationId, hasDetails } from '../../utils/reservations';
import { MAX_TRIP_DAYS, tripLengthDays, latestCheckOut, isAllowedTripLength } from '../../../shared/tripLength.js';
import { AGE_GROUPS, CURRENCIES, BUDGET_PARTS, INTERESTS, INTEREST_WEIGHTS } from '../../../shared/tripPreferences.js';

// The answer controls for the chat questionnaire: tappable chips for choices, and small
// inline cards for answers that need typing (dates, addresses, flights). Every control is a
// 44px touch target and inputs use 16px text so phones don't zoom in.

const chipClass = (selected = false) =>
    `min-h-[44px] rounded-full border-2 px-4 py-2 text-sm font-semibold transition-colors ${
        selected ? 'border-brand-600 bg-brand-600 text-white' : 'border-brand-200 bg-white text-brand-700 hover:border-brand-400 hover:bg-brand-50'
    }`;
const fieldClass =
    'w-full min-h-[44px] rounded-xl border-2 border-slate-200 bg-white px-3.5 py-2 text-base text-slate-900 focus:border-brand-500 focus:outline-none';
const sendClass =
    'inline-flex min-h-[44px] items-center gap-1.5 rounded-full bg-brand-600 px-5 text-sm font-bold text-white transition hover:bg-brand-700 disabled:cursor-not-allowed disabled:opacity-40';
const skipClass = 'min-h-[44px] rounded-full px-4 text-sm font-semibold text-slate-500 transition hover:bg-slate-100 hover:text-slate-800';

// The answer area for one question (it sits inside the chat's input box)
export function AnswerCard({ children, label }) {
    return (
        <div role="group" aria-label={label} className="w-full space-y-3">
            {children}
        </div>
    );
}

function Actions({ children }) {
    return <div className="flex flex-wrap items-center justify-end gap-2">{children}</div>;
}

export function SendButton({ disabled, children = 'Send', type = 'submit', onClick }) {
    return (
        <button type={type} onClick={onClick} disabled={disabled} className={sendClass}>
            {children}
            <Send size={15} aria-hidden="true" />
        </button>
    );
}

export function SkipButton({ onClick, children = 'No preference' }) {
    return (
        <button type="button" onClick={onClick} className={skipClass}>
            {children}
        </button>
    );
}

// Quick replies: tap one to answer. options: [id, label][]
export function Choices({ options, onPick, label }) {
    return (
        <div role="group" aria-label={label} className="flex flex-wrap gap-2">
            {options.map(([id, text]) => (
                <button key={String(id)} type="button" onClick={() => onPick(id, text)} className={chipClass()}>
                    {text}
                </button>
            ))}
        </div>
    );
}

// Pick any number of options, then Done
export function MultiAnswer({ label, options, initial = [], onDone, onSkip, skipLabel, disabledIds = [] }) {
    const [value, setValue] = useState(initial);
    const toggle = (id) => setValue((v) => (v.includes(id) ? v.filter((x) => x !== id) : [...v, id]));
    return (
        <AnswerCard label={label}>
            <div className="flex flex-wrap gap-2">
                {options.map(([id, text]) => (
                    <button
                        key={id}
                        type="button"
                        aria-pressed={value.includes(id)}
                        disabled={disabledIds.includes(id)}
                        onClick={() => toggle(id)}
                        className={`${chipClass(value.includes(id))} disabled:cursor-not-allowed disabled:opacity-40`}
                    >
                        {text}
                    </button>
                ))}
            </div>
            <Actions>
                {onSkip && <SkipButton onClick={onSkip}>{skipLabel}</SkipButton>}
                <SendButton type="button" disabled={!value.length} onClick={() => onDone(value)}>Done</SendButton>
            </Actions>
        </AnswerCard>
    );
}

// The destination, picked from the list
export function CountryAnswer({ initial, onSend }) {
    const [country, setCountry] = useState(initial || '');
    return (
        <AnswerCard label="Destination">
            <DestinationPicker value={country} onChange={setCountry} />
            <Actions>
                <SendButton type="button" disabled={!country} onClick={() => onSend(country)} />
            </Actions>
        </AnswerCard>
    );
}

// A city: suggestions from the destination's list as chips, or type any name
export function CityAnswer({ country, initial, onSend }) {
    const [name, setName] = useState(initial || '');
    const cities = CITIES_BY_COUNTRY[country] || [];
    const q = name.trim().toLowerCase();
    const suggestions = (q ? cities.filter((c) => c.toLowerCase().includes(q) && c.toLowerCase() !== q) : cities).slice(0, 6);
    const submit = (e) => {
        e.preventDefault();
        if (name.trim()) onSend(name.trim());
    };
    return (
        <form onSubmit={submit}>
            <AnswerCard label="City">
                {suggestions.length > 0 && (
                    <div className="flex flex-wrap gap-2">
                        {suggestions.map((c) => (
                            <button key={c} type="button" onClick={() => onSend(c)} className={chipClass()}>
                                {c}
                            </button>
                        ))}
                    </div>
                )}
                <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Or type a city" aria-label="City name" className={fieldClass} />
                <Actions>
                    <SendButton disabled={!name.trim()} />
                </Actions>
            </AnswerCard>
        </form>
    );
}

function todayStr() {
    const now = new Date();
    return new Date(now.getTime() - now.getTimezoneOffset() * 60000).toISOString().split('T')[0];
}

// Check-in and check-out for one city; the whole trip has to fit in MAX_TRIP_DAYS
export function DatesAnswer({ cities, index, onSend }) {
    const [checkIn, setCheckIn] = useState(cities[index].checkIn || '');
    const [checkOut, setCheckOut] = useState(cities[index].checkOut || '');
    const withThese = cities.map((c, i) => (i === index ? { ...c, checkIn, checkOut } : c));
    const days = tripLengthDays(withThese.filter((c) => c.checkIn && c.checkOut));
    const maxCheckOut = latestCheckOut(withThese) || undefined;
    const order = checkIn && checkOut && checkOut <= checkIn;
    const tooLong = !order && checkIn && checkOut && !isAllowedTripLength(days);
    const ready = checkIn && checkOut && !order && !tooLong;
    const submit = (e) => {
        e.preventDefault();
        if (ready) onSend({ checkIn, checkOut });
    };
    return (
        <form onSubmit={submit}>
            <AnswerCard label="Dates">
                <div className="grid grid-cols-2 gap-3">
                    <label className="text-xs font-semibold text-slate-600">
                        Check-in
                        <input type="date" value={checkIn} min={todayStr()} onChange={(e) => setCheckIn(e.target.value)} className={`${fieldClass} mt-1`} />
                    </label>
                    <label className="text-xs font-semibold text-slate-600">
                        Check-out
                        <input type="date" value={checkOut} min={checkIn || todayStr()} max={maxCheckOut} onChange={(e) => setCheckOut(e.target.value)} className={`${fieldClass} mt-1`} />
                    </label>
                </div>
                {order && <p className="text-sm text-red-600">Check-out must be after check-in.</p>}
                {tooLong && <p className="text-sm text-red-600">That makes the trip {days} days. Trips can be up to {MAX_TRIP_DAYS} days.</p>}
                <Actions>
                    <SendButton disabled={!ready} />
                </Actions>
            </AnswerCard>
        </form>
    );
}

// Checks an address before sending it. The validation service failing doesn't block anyone.
function useAddressCheck() {
    const [status, setStatus] = useState('idle');
    const check = async (address) => {
        setStatus('checking');
        try {
            const result = await validateAddress(address);
            if (!result.valid) {
                setStatus('invalid');
                return null;
            }
            setStatus('valid');
            return { coords: Number.isFinite(result.lat) && Number.isFinite(result.lon) ? [result.lat, result.lon] : null };
        } catch {
            setStatus('valid');
            return { coords: null };
        }
    };
    return [status, setStatus, check];
}

function AddressStatus({ status }) {
    if (status === 'checking') {
        return (
            <p className="flex items-center gap-1.5 text-sm text-slate-500">
                <Loader2 size={14} className="animate-spin" /> Checking the address…
            </p>
        );
    }
    if (status === 'invalid') return <p className="text-sm text-red-600">I couldn't find that address. Could you check it?</p>;
    return null;
}

// A booked hotel: search for it, or type its name and address
export function HotelAnswer({ city, country, onSend }) {
    const [hotel, setHotel] = useState({ name: '', address: '', confirmationCode: '', ...city.hotel });
    const [searching, setSearching] = useState(false);
    const [verified, setVerified] = useState(city.hotelAddressStatus === 'valid' ? city.hotel.address : null);
    const [status, setStatus, check] = useAddressCheck();
    const ready = hotel.name.trim() && hotel.address.trim() && status !== 'checking';

    const send = async (e) => {
        e.preventDefault();
        if (!ready) return;
        let coords = hotel.coords ?? null;
        if (verified !== hotel.address) {
            const result = await check(hotel.address);
            if (!result) return;
            coords = result.coords;
        }
        onSend({ hotel: { ...hotel, coords }, hotelAddressStatus: 'valid' });
    };

    return (
        <form onSubmit={send}>
            <AnswerCard label="Hotel">
                <button
                    type="button"
                    onClick={() => setSearching(true)}
                    className="flex w-full min-h-[44px] items-center justify-center gap-2 rounded-xl border-2 border-brand-200 font-semibold text-brand-700 transition hover:bg-brand-50"
                >
                    <Search size={16} aria-hidden="true" /> Search hotels in {city.name}
                </button>
                <input value={hotel.name} onChange={(e) => setHotel({ ...hotel, name: e.target.value })} placeholder="Hotel name" aria-label="Hotel name" className={fieldClass} />
                <input
                    value={hotel.address}
                    onChange={(e) => { setHotel({ ...hotel, address: e.target.value, coords: null }); setStatus('idle'); }}
                    placeholder="Hotel address"
                    aria-label="Hotel address"
                    className={fieldClass}
                />
                <input
                    value={hotel.confirmationCode || ''}
                    onChange={(e) => setHotel({ ...hotel, confirmationCode: e.target.value })}
                    placeholder="Confirmation code (optional)"
                    aria-label="Confirmation code"
                    className={`${fieldClass} font-mono uppercase placeholder:normal-case placeholder:font-sans`}
                />
                <AddressStatus status={status} />
                <Actions>
                    <SendButton disabled={!ready} />
                </Actions>
            </AnswerCard>
            <HotelSearchModal
                open={searching}
                city={city.name}
                country={country}
                onClose={() => setSearching(false)}
                onSelect={(found) => {
                    const coords = Number.isFinite(found.lat) && Number.isFinite(found.lon) ? [found.lat, found.lon] : null;
                    setHotel({ ...hotel, name: found.name, address: found.address, coords });
                    setVerified(found.address);
                    setStatus('valid');
                    setSearching(false);
                }}
            />
        </form>
    );
}

// Their own place (an Airbnb, a friend's flat...)
export function AddressAnswer({ initial, onSend }) {
    const [address, setAddress] = useState(initial || '');
    const [status, setStatus, check] = useAddressCheck();
    const ready = address.trim() && status !== 'checking';
    const send = async (e) => {
        e.preventDefault();
        if (!ready) return;
        const result = await check(address.trim());
        if (result) onSend({ customAddress: address.trim(), customCoords: result.coords, customAddressStatus: 'valid' });
    };
    return (
        <form onSubmit={send}>
            <AnswerCard label="Address">
                <input value={address} onChange={(e) => { setAddress(e.target.value); setStatus('idle'); }} placeholder="e.g. 123 Main St, Tokyo" aria-label="Address" className={fieldClass} />
                <AddressStatus status={status} />
                <Actions>
                    <SendButton disabled={!ready} />
                </Actions>
            </AnswerCard>
        </form>
    );
}

// Any number of flights; blank ones are never added
export function FlightsAnswer({ initial = [], onDone }) {
    const [flights, setFlights] = useState(initial.filter(hasDetails));
    const [draft, setDraft] = useState(null);
    const save = () => {
        if (hasDetails(draft)) setFlights([...flights, draft]);
        setDraft(null);
    };
    const label = (f) => [f.airline, f.flightNumber].filter(Boolean).join(' ') || [f.from, f.to].filter(Boolean).join(' → ') || 'Flight';

    return (
        <AnswerCard label="Flights">
            {flights.length > 0 && (
                <ul className="space-y-2">
                    {flights.map((f) => (
                        <li key={f.id} className="flex items-center gap-2 rounded-xl bg-brand-50 px-3 py-2 text-sm font-semibold text-brand-800">
                            <Plane size={15} aria-hidden="true" />
                            <span className="flex-1 truncate">{label(f)}{f.date ? ` · ${f.date}` : ''}</span>
                            <button type="button" onClick={() => setFlights(flights.filter((x) => x.id !== f.id))} aria-label={`Remove ${label(f)}`} className="rounded-full p-1.5 text-brand-700 hover:bg-white">
                                <X size={15} />
                            </button>
                        </li>
                    ))}
                </ul>
            )}
            {draft ? (
                <>
                    <FlightFields value={draft} onChange={(patch) => setDraft({ ...draft, ...patch })} />
                    <Actions>
                        <SkipButton onClick={() => setDraft(null)}>Cancel</SkipButton>
                        <SendButton type="button" disabled={!hasDetails(draft)} onClick={save}>Save flight</SendButton>
                    </Actions>
                </>
            ) : (
                <Actions>
                    <button type="button" onClick={() => setDraft({ ...BLANK_FLIGHT, id: newReservationId() })} className={`${chipClass()} inline-flex items-center gap-1.5`}>
                        <Plus size={15} aria-hidden="true" /> {flights.length ? 'Add another' : 'Add a flight'}
                    </button>
                    {flights.length > 0 ? (
                        <SendButton type="button" onClick={() => onDone(flights)}>Done</SendButton>
                    ) : (
                        <SkipButton onClick={() => onDone([])}>Not yet</SkipButton>
                    )}
                </Actions>
            )}
        </AnswerCard>
    );
}

// The budget, and (optionally) what it covers
export function BudgetAnswer({ initial, initialCovers = [], onDone, onSkip }) {
    const [value, setValue] = useState(initial);
    const [covers, setCovers] = useState(initialCovers);
    const toggleCover = (id) => setCovers((c) => (c.includes(id) ? c.filter((x) => x !== id) : [...c, id]));
    const backwards = value.min !== '' && value.max !== '' && Number(value.min) > Number(value.max);
    const ready = (value.min !== '' || value.max !== '') && !backwards;
    return (
        <AnswerCard label="Budget">
            <div role="radiogroup" aria-label="Budget is" className="inline-flex rounded-full border-2 border-slate-200 p-1">
                {[['total', 'Whole trip'], ['day', 'Per day']].map(([id, label]) => (
                    <button
                        key={id}
                        type="button"
                        role="radio"
                        aria-checked={value.per === id}
                        onClick={() => setValue({ ...value, per: id })}
                        className={`min-h-[40px] rounded-full px-4 text-sm font-semibold ${value.per === id ? 'bg-brand-600 text-white' : 'text-slate-700'}`}
                    >
                        {label}
                    </button>
                ))}
            </div>
            <div className="grid grid-cols-[1fr_1fr_auto] items-end gap-2">
                <label className="text-xs font-semibold text-slate-600">
                    From
                    <input type="number" inputMode="numeric" min={0} value={value.min} onChange={(e) => setValue({ ...value, min: e.target.value })} placeholder="0" className={`${fieldClass} mt-1`} />
                </label>
                <label className="text-xs font-semibold text-slate-600">
                    Up to
                    <input type="number" inputMode="numeric" min={0} value={value.max} onChange={(e) => setValue({ ...value, max: e.target.value })} placeholder="2000" className={`${fieldClass} mt-1`} />
                </label>
                <label className="text-xs font-semibold text-slate-600">
                    <span className="sr-only">Currency</span>
                    <select value={value.currency} onChange={(e) => setValue({ ...value, currency: e.target.value })} className={`${fieldClass} mt-1 pr-8`}>
                        {CURRENCIES.map((c) => <option key={c}>{c}</option>)}
                    </select>
                </label>
            </div>
            {backwards && <p className="text-sm text-red-600">"From" is more than "Up to".</p>}
            <div role="group" aria-label="What the budget covers">
                <p className="mb-2 text-sm font-semibold text-slate-800">
                    What does it cover?<span className="ml-1.5 text-xs font-normal text-slate-400">optional</span>
                </p>
                <div className="flex flex-wrap gap-2">
                    {BUDGET_PARTS.map(([id, text]) => (
                        <button key={id} type="button" aria-pressed={covers.includes(id)} onClick={() => toggleCover(id)} className={chipClass(covers.includes(id))}>
                            {text}
                        </button>
                    ))}
                </div>
            </div>
            <Actions>
                <SkipButton onClick={onSkip} />
                <SendButton type="button" disabled={!ready} onClick={() => onDone(value, covers)}>Done</SendButton>
            </Actions>
        </AnswerCard>
    );
}

export function SplurgeSaveAnswer({ initial, onDone, onSkip }) {
    const [value, setValue] = useState(initial);
    const toggle = (side, other, id) => {
        const list = value[side].includes(id) ? value[side].filter((x) => x !== id) : [...value[side], id];
        setValue({ ...value, [side]: list, [other]: value[other].filter((x) => x !== id) });
    };
    const row = (side, other, title) => (
        <div>
            <p className="mb-1.5 text-xs font-semibold text-slate-600">{title}</p>
            <div role="group" aria-label={title} className="flex flex-wrap gap-2">
                {BUDGET_PARTS.map(([id, text]) => (
                    <button key={id} type="button" aria-pressed={value[side].includes(id)} onClick={() => toggle(side, other, id)} className={chipClass(value[side].includes(id))}>
                        {text}
                    </button>
                ))}
            </div>
        </div>
    );
    return (
        <AnswerCard label="Splurge or save">
            {row('splurge', 'save', 'Splurge on')}
            {row('save', 'splurge', 'Save on')}
            <Actions>
                <SkipButton onClick={onSkip} />
                <SendButton type="button" disabled={!value.splurge.length && !value.save.length} onClick={() => onDone(value)}>Done</SendButton>
            </Actions>
        </AnswerCard>
    );
}

const weightLabel = (w) => INTEREST_WEIGHTS.find(([k]) => k === w)?.[1];

// Tap an interest to cycle it: not interested → some → a lot → must → not interested
export function InterestsAnswer({ initial, onDone, onSkip }) {
    const [value, setValue] = useState(initial);
    const cycle = (id) => {
        const next = { ...value };
        const w = (value[id] || 0) + 1;
        if (w > 3) delete next[id];
        else next[id] = w;
        setValue(next);
    };
    const shade = [
        'border-slate-200 bg-white text-slate-700',
        'border-brand-300 bg-brand-50 text-brand-800',
        'border-brand-500 bg-brand-100 text-brand-900',
        'border-brand-700 bg-brand-600 text-white',
    ];
    return (
        <AnswerCard label="Interests">
            <p className="text-xs text-slate-500">Tap once for some interest, again for a lot, a third time for a must.</p>
            <div className="flex flex-wrap gap-2">
                {INTERESTS.map(([id, label]) => {
                    const w = value[id] || 0;
                    return (
                        <button
                            key={id}
                            type="button"
                            onClick={() => cycle(id)}
                            aria-label={`${label}: ${w ? weightLabel(w) : 'not selected'}`}
                            className={`min-h-[44px] rounded-full border-2 px-4 py-2 text-sm font-medium transition-colors ${shade[w]}`}
                        >
                            {label}
                            {w > 0 && <span className="ml-1.5 text-xs opacity-80">{'•'.repeat(w)}</span>}
                        </button>
                    );
                })}
            </div>
            <Actions>
                <SkipButton onClick={onSkip} />
                <SendButton type="button" disabled={!Object.keys(value).length} onClick={() => onDone(value)}>Done</SendButton>
            </Actions>
        </AnswerCard>
    );
}

const TRAVELERS_DEFAULT = { kids: 0, teens: 0, adults: 2, seniors: 0 };
const emptyFor = (part) =>
    part.kind === 'multi' ? [] : part.kind === 'text' || part.kind === 'time' ? '' : part.kind === 'travelers' ? TRAVELERS_DEFAULT : null;

// Several related questions in one turn, with one Done. Each part: { id, label, kind, options,
// initial, required, placeholder, multiline }. kind: 'single' (tap one; tap again to clear),
// 'multi', 'text', 'time' or 'travelers'. onDone gets { [id]: value }, with null for anything
// left unanswered (optional parts can simply be left blank).
export function ComboAnswer({ label, parts, onDone }) {
    const [values, setValues] = useState(() => Object.fromEntries(parts.map((p) => [p.id, p.initial ?? emptyFor(p)])));
    // Travelers start at a default count, so they only count as answered once touched
    const [touched, setTouched] = useState(() => Object.fromEntries(parts.map((p) => [p.id, p.kind !== 'travelers' || p.initial != null])));
    const set = (id, value) => {
        setValues((prev) => ({ ...prev, [id]: value }));
        setTouched((prev) => ({ ...prev, [id]: true }));
    };
    const filled = (p) => {
        const v = values[p.id];
        if (p.kind === 'multi') return v.length > 0;
        if (p.kind === 'travelers') return touched[p.id] && Object.values(v).some(Boolean);
        if (p.kind === 'text' || p.kind === 'time') return v.trim() !== '';
        return v !== null && v !== undefined;
    };
    const ready = parts.every((p) => !p.required || filled(p));
    const optionalOnly = parts.every((p) => !p.required);
    const result = (all) => Object.fromEntries(parts.map((p) => [p.id, all && filled(p) ? (typeof values[p.id] === 'string' ? values[p.id].trim() : values[p.id]) : null]));

    const control = (p) => {
        const v = values[p.id];
        if (p.kind === 'single') {
            return (
                <div className="flex flex-wrap gap-2">
                    {p.options.map(([id, text]) => (
                        <button key={String(id)} type="button" aria-pressed={v === id} onClick={() => set(p.id, v === id ? null : id)} className={chipClass(v === id)}>
                            {text}
                        </button>
                    ))}
                </div>
            );
        }
        if (p.kind === 'multi') {
            const toggle = (id) => set(p.id, v.includes(id) ? v.filter((x) => x !== id) : [...v, id]);
            return (
                <div className="flex flex-wrap gap-2">
                    {p.options.map(([id, text]) => (
                        <button key={id} type="button" aria-pressed={v.includes(id)} onClick={() => toggle(id)} className={chipClass(v.includes(id))}>
                            {text}
                        </button>
                    ))}
                </div>
            );
        }
        if (p.kind === 'travelers') {
            return (
                <div className="divide-y divide-slate-100 rounded-2xl border-2 border-slate-100 px-3">
                    {AGE_GROUPS.map(([key, text]) => (
                        <Stepper key={key} label={text} value={v[key] || 0} onChange={(n) => set(p.id, { ...v, [key]: n })} />
                    ))}
                </div>
            );
        }
        if (p.kind === 'time') return <TimeSelect value={v} onChange={(t) => set(p.id, t)} aria-label={p.label} className={fieldClass} />;
        const props = { value: v, placeholder: p.placeholder, 'aria-label': p.label, maxLength: p.maxLength || 500, onChange: (e) => set(p.id, e.target.value), className: fieldClass };
        return p.multiline ? <textarea rows={2} {...props} /> : <input type="text" {...props} />;
    };

    return (
        <AnswerCard label={label}>
            <div className="space-y-4">
                {parts.map((p) => (
                    <div key={p.id} role="group" aria-label={p.label}>
                        <p className="mb-2 text-sm font-semibold text-slate-800">
                            {p.label}
                            {!p.required && <span className="ml-1.5 text-xs font-normal text-slate-400">optional</span>}
                        </p>
                        {control(p)}
                    </div>
                ))}
            </div>
            <Actions>
                {optionalOnly && <SkipButton onClick={() => onDone(result(false))}>Skip these</SkipButton>}
                <SendButton type="button" disabled={!ready} onClick={() => onDone(result(true))}>Done</SendButton>
            </Actions>
        </AnswerCard>
    );
}
