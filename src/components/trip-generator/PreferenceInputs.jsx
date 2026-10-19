import React, { useId } from 'react';
import { Link } from 'react-router-dom';
import { Minus, Plus } from 'lucide-react';
import { SCALES } from '../../../shared/tripPreferences.js';

// Building blocks for the questionnaire's optional questions (issue #90). Mobile first: every
// control is a 44px touch target, inputs use 16px text so phones don't zoom in.

export function StepHeading({ title, subtitle }) {
    return (
        <div>
            <h2 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-1">{title}</h2>
            {subtitle && <p className="text-gray-600">{subtitle}</p>}
        </div>
    );
}

// An optional question with a "No preference" checkbox. `field` is { value, noPreference }.
// The control stays usable while "No preference" is ticked (just dimmed): answering it unticks
// the box, and ticking it again sets the answer aside without throwing it away.
// children: (value, setValue) => control
export function OptionalField({ label, hint, field, onChange, children }) {
    const id = useId();
    const setValue = (value) => onChange({ value, noPreference: false });
    // A labelled group rather than <fieldset>: a legend only names its fieldset as the first
    // child, which this layout (label and checkbox side by side) can't keep
    return (
        <div role="group" aria-labelledby={`${id}-label`} className="space-y-2">
            <div className="flex flex-wrap items-start justify-between gap-x-4 gap-y-1">
                <p id={`${id}-label`} className="text-sm font-semibold text-gray-800">
                    {label}
                    {hint && <span className="block text-xs font-normal text-gray-500 mt-0.5">{hint}</span>}
                </p>
                <label htmlFor={id} className="inline-flex min-h-[44px] sm:min-h-0 items-center gap-2 text-sm text-gray-600 cursor-pointer select-none">
                    <input
                        id={id}
                        type="checkbox"
                        checked={field.noPreference}
                        onChange={(e) => onChange({ ...field, noPreference: e.target.checked })}
                        className="h-4 w-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                    />
                    No preference
                </label>
            </div>
            <div className={field.noPreference ? 'opacity-50 transition-opacity' : 'transition-opacity'}>
                {children(field.value, setValue)}
            </div>
        </div>
    );
}

const chipClass = (selected) =>
    `min-h-[44px] px-4 py-2 rounded-full border-2 text-sm font-medium transition-colors ${
        selected ? 'border-indigo-500 bg-indigo-50 text-indigo-800' : 'border-gray-200 text-gray-700 hover:border-indigo-300'
    }`;

// Pick one of `options` ([id, label]); tapping the selected one clears it
export function SingleChips({ options, value, onChange, label }) {
    return (
        <div role="radiogroup" aria-label={label} className="flex flex-wrap gap-2">
            {options.map(([id, text]) => (
                <button key={id} type="button" role="radio" aria-checked={value === id} onClick={() => onChange(value === id ? null : id)} className={chipClass(value === id)}>
                    {text}
                </button>
            ))}
        </div>
    );
}

// Pick any of `options`
export function MultiChips({ options, value = [], onChange, label, disabledIds = [] }) {
    const toggle = (id) => onChange(value.includes(id) ? value.filter((v) => v !== id) : [...value, id]);
    return (
        <div role="group" aria-label={label} className="flex flex-wrap gap-2">
            {options.map(([id, text]) => (
                <button
                    key={id}
                    type="button"
                    aria-pressed={value.includes(id)}
                    disabled={disabledIds.includes(id)}
                    onClick={() => toggle(id)}
                    className={`${chipClass(value.includes(id))} disabled:opacity-40 disabled:cursor-not-allowed`}
                >
                    {text}
                </button>
            ))}
        </div>
    );
}

// A 1–5 slider between two labels (SCALES in shared/tripPreferences.js)
export function ScaleSlider({ scale, value, onChange, label }) {
    const [low, high] = SCALES[scale];
    return (
        <div>
            <input
                type="range"
                min={1}
                max={5}
                step={1}
                value={value}
                onChange={(e) => onChange(Number(e.target.value))}
                aria-label={label}
                aria-valuetext={value <= 2 ? low : value >= 4 ? high : 'In between'}
                className="w-full h-11 accent-indigo-600 cursor-pointer"
            />
            <div className="flex justify-between gap-4 text-xs text-gray-600">
                <span>{low}</span>
                <span className="text-right">{high}</span>
            </div>
        </div>
    );
}

// − n + for a count
export function Stepper({ label, value, onChange, min = 0, max = 20 }) {
    return (
        <div className="flex items-center justify-between gap-3 py-1">
            <span className="text-sm text-gray-800">{label}</span>
            <div className="flex items-center gap-1">
                <button type="button" onClick={() => onChange(Math.max(min, value - 1))} disabled={value <= min} aria-label={`Fewer ${label.toLowerCase()}`} className="h-11 w-11 flex items-center justify-center rounded-full border-2 border-gray-200 text-gray-700 disabled:opacity-30">
                    <Minus size={16} />
                </button>
                <span className="w-8 text-center font-semibold tabular-nums" aria-live="polite">{value}</span>
                <button type="button" onClick={() => onChange(Math.min(max, value + 1))} disabled={value >= max} aria-label={`More ${label.toLowerCase()}`} className="h-11 w-11 flex items-center justify-center rounded-full border-2 border-gray-200 text-gray-700 disabled:opacity-30">
                    <Plus size={16} />
                </button>
            </div>
        </div>
    );
}

// A yes/no extra (no "No preference": unticked just means it isn't mentioned)
export function CheckOption({ checked, onChange, children, hint }) {
    return (
        <label className="flex min-h-[44px] items-start gap-3 rounded-xl border-2 border-gray-200 p-3 cursor-pointer hover:border-indigo-300 has-[:checked]:border-indigo-500 has-[:checked]:bg-indigo-50">
            <input type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} className="mt-0.5 h-5 w-5 flex-none rounded border-gray-300 text-indigo-600 focus:ring-indigo-500" />
            <span className="text-sm text-gray-800">
                {children}
                {hint && <span className="block text-xs text-gray-500 mt-0.5">{hint}</span>}
            </span>
        </label>
    );
}

// Needs saved on the organizer's profile, shown read-only (they're not asked again here)
export function ProfileNeeds({ title, needs, empty }) {
    return (
        <div className="rounded-xl bg-gray-50 border border-gray-200 p-4 text-sm">
            <p className="font-semibold text-gray-800">{title}</p>
            {needs.length ? (
                <ul className="mt-2 flex flex-wrap gap-2">
                    {needs.map((n) => (
                        <li key={n} className="rounded-full bg-white border border-gray-200 px-3 py-1 text-gray-700">{n}</li>
                    ))}
                </ul>
            ) : (
                <p className="mt-1 text-gray-600">{empty}</p>
            )}
            <p className="mt-2 text-xs text-gray-500">
                From your profile, used for every trip.{' '}
                <Link to="/profile?tab=safety" target="_blank" className="font-semibold text-indigo-700 hover:underline">Edit in profile</Link>
            </p>
        </div>
    );
}
