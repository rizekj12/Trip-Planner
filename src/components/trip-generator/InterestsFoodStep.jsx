import React from 'react';
import { INTERESTS, INTEREST_WEIGHTS, DINING_STYLES } from '../../../shared/tripPreferences.js';
import { DIETARY_NEEDS } from '../../../shared/accessibility.js';
import { useProfile } from '../../hooks/useProfile';
import { usePreferences, inputClass } from './preferenceForm';
import { StepHeading, OptionalField, SingleChips, ScaleSlider, CheckOption, ProfileNeeds } from './PreferenceInputs';

const weightLabel = (w) => INTEREST_WEIGHTS.find(([k]) => k === w)?.[1];

// Tap an interest to cycle it: not interested → some → a lot → must → not interested
function WeightedInterests({ value, onChange }) {
    const cycle = (id) => {
        const next = { ...value };
        const w = (value[id] || 0) + 1;
        if (w > 3) delete next[id];
        else next[id] = w;
        onChange(next);
    };
    const shade = ['border-gray-200 text-gray-700', 'border-indigo-300 bg-indigo-50 text-indigo-800', 'border-indigo-500 bg-indigo-100 text-indigo-900', 'border-indigo-700 bg-indigo-600 text-white'];
    return (
        <div>
            <p className="text-xs text-gray-500 mb-2">Tap once for some interest, again for a lot, a third time for a must.</p>
            <div role="group" aria-label="Interests" className="flex flex-wrap gap-2">
                {INTERESTS.map(([id, label]) => {
                    const w = value[id] || 0;
                    return (
                        <button
                            key={id}
                            type="button"
                            onClick={() => cycle(id)}
                            aria-label={`${label}: ${w ? weightLabel(w) : 'not selected'}`}
                            className={`min-h-[44px] px-4 py-2 rounded-full border-2 text-sm font-medium transition-colors ${shade[w]}`}
                        >
                            {label}
                            {w > 0 && <span className="ml-1.5 text-xs opacity-80">{'•'.repeat(w)}</span>}
                        </button>
                    );
                })}
            </div>
        </div>
    );
}

// What they love doing, and how they like to eat (issue #90). Dietary needs come from the
// organizer's profile and are only shown here.
export default function InterestsFoodStep({ formData, updateFormData }) {
    const [p, set] = usePreferences(formData, updateFormData);
    const profile = useProfile();
    const dietary = (profile.data?.accessibility_needs || []).filter((n) => DIETARY_NEEDS.includes(n));

    return (
        <div className="space-y-7">
            <StepHeading title="Interests & food" subtitle="All optional. The more you tell us, the more it feels like your trip." />

            <OptionalField label="What are you into?" field={p.interests} onChange={(f) => set('interests', f)}>
                {(value, setValue) => <WeightedInterests value={value} onChange={setValue} />}
            </OptionalField>

            <OptionalField label="Famous sights or hidden gems?" field={p.touristy} onChange={(f) => set('touristy', f)}>
                {(value, setValue) => <ScaleSlider scale="touristy" label="Touristy or off the beaten path" value={value} onChange={setValue} />}
            </OptionalField>

            <OptionalField label="Anything you must do?" hint="Places or experiences you already know you want" field={p.mustDo} onChange={(f) => set('mustDo', f)}>
                {(value, setValue) => (
                    <textarea rows={2} maxLength={500} value={value} onChange={(e) => setValue(e.target.value)} placeholder="e.g. sunrise at Fushimi Inari, a sumo match" className={inputClass} />
                )}
            </OptionalField>

            <OptionalField label="Anything to avoid?" field={p.avoid} onChange={(f) => set('avoid', f)}>
                {(value, setValue) => (
                    <textarea rows={2} maxLength={500} value={value} onChange={(e) => setValue(e.target.value)} placeholder='e.g. "no museums", "hate crowds"' className={inputClass} />
                )}
            </OptionalField>

            <div className="border-t border-gray-100 pt-6 space-y-7">
                <h3 className="text-lg font-bold text-gray-900">Food</h3>
                {!profile.isLoading && (
                    <ProfileNeeds title="Dietary needs" needs={dietary} empty="None saved. Every restaurant pick will be open to you." />
                )}

                <OptionalField label="Dining style" field={p.diningStyle} onChange={(f) => set('diningStyle', f)}>
                    {(value, setValue) => <SingleChips label="Dining style" options={DINING_STYLES} value={value} onChange={setValue} />}
                </OptionalField>

                <OptionalField label="How adventurous with food?" field={p.foodAdventure} onChange={(f) => set('foodAdventure', f)}>
                    {(value, setValue) => <ScaleSlider scale="foodAdventure" label="Food adventurousness" value={value} onChange={setValue} />}
                </OptionalField>

                <CheckOption checked={p.foodExperiences} onChange={(v) => set('foodExperiences', v)}>
                    Interested in a food tour or cooking class
                </CheckOption>
            </div>
        </div>
    );
}
