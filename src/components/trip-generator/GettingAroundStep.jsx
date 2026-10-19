import React from 'react';
import { TRANSPORT_MODES, WALKING, LANGUAGE_COMFORT, OCCASIONS, WEATHER } from '../../../shared/tripPreferences.js';
import { MOBILITY_AND_ACCESS_NEEDS } from '../../../shared/accessibility.js';
import { useProfile } from '../../hooks/useProfile';
import { usePreferences, inputClass } from './preferenceForm';
import { StepHeading, OptionalField, SingleChips, MultiChips, CheckOption, ProfileNeeds } from './PreferenceInputs';

// Getting around, plus the last practical extras before review (issue #90). Mobility needs come
// from the organizer's profile and are only shown here.
export default function GettingAroundStep({ formData, updateFormData }) {
    const [p, set] = usePreferences(formData, updateFormData);
    const profile = useProfile();
    const mobility = (profile.data?.accessibility_needs || []).filter((n) => MOBILITY_AND_ACCESS_NEEDS.includes(n));
    const setOutput = (key) => (checked) => set('output', { ...p.output, [key]: checked });

    return (
        <div className="space-y-7">
            <StepHeading title="Getting around & extras" subtitle="All optional. Almost done!" />

            {!profile.isLoading && (
                <ProfileNeeds title="Accessibility needs" needs={mobility} empty="None saved." />
            )}

            <OptionalField label="How do you like to get around?" field={p.transport} onChange={(f) => set('transport', f)}>
                {(value, setValue) => <MultiChips label="Transport" options={TRANSPORT_MODES} value={value} onChange={setValue} />}
            </OptionalField>

            <OptionalField label="Comfortable walking per day" field={p.maxWalking} onChange={(f) => set('maxWalking', f)}>
                {(value, setValue) => (
                    <div>
                        <input
                            type="range"
                            min={1}
                            max={WALKING.length}
                            step={1}
                            value={value}
                            onChange={(e) => setValue(Number(e.target.value))}
                            aria-label="Comfortable walking per day"
                            aria-valuetext={WALKING[value - 1][1]}
                            className="w-full h-11 accent-indigo-600 cursor-pointer"
                        />
                        <p className="text-sm font-medium text-gray-800">{WALKING[value - 1][1]}</p>
                    </div>
                )}
            </OptionalField>

            <OptionalField label="Day trips outside the cities?" field={p.dayTrips} onChange={(f) => set('dayTrips', f)}>
                {(value, setValue) => (
                    <SingleChips label="Day trips" options={[['yes', 'Yes, happy to'], ['no', 'No, stay in the cities']]} value={value ? 'yes' : 'no'} onChange={(v) => setValue(v !== 'no')} />
                )}
            </OptionalField>

            <div className="border-t border-gray-100 pt-6 space-y-7">
                <h3 className="text-lg font-bold text-gray-900">Extras</h3>

                <OptionalField label="Language" field={p.language} onChange={(f) => set('language', f)}>
                    {(value, setValue) => <SingleChips label="Language comfort" options={LANGUAGE_COMFORT} value={value} onChange={setValue} />}
                </OptionalField>

                <OptionalField label="A special occasion?" field={p.occasion} onChange={(f) => set('occasion', f)}>
                    {(value, setValue) => (
                        <div className="space-y-3">
                            <SingleChips label="Occasion" options={OCCASIONS} value={value.type} onChange={(type) => setValue({ ...value, type })} />
                            <input
                                type="text"
                                maxLength={200}
                                value={value.note}
                                onChange={(e) => setValue({ ...value, note: e.target.value })}
                                placeholder="Anything we should know? e.g. Sam turns 30 on day 3"
                                aria-label="About the occasion"
                                className={inputClass}
                            />
                        </div>
                    )}
                </OptionalField>

                <OptionalField label="Weather you're fine with" field={p.weather} onChange={(f) => set('weather', f)}>
                    {(value, setValue) => <MultiChips label="Weather" options={WEATHER} value={value} onChange={setValue} />}
                </OptionalField>

                <div className="space-y-2">
                    <p className="text-sm font-semibold text-gray-800">Add to my itinerary</p>
                    <CheckOption checked={p.output.costs} onChange={setOutput('costs')}>Estimated costs for each stop</CheckOption>
                    <CheckOption checked={p.output.bookingLinks} onChange={setOutput('bookingLinks')} hint="A quick search for tickets and reservations">
                        Booking links
                    </CheckOption>
                    <CheckOption checked={p.output.rainyDay} onChange={setOutput('rainyDay')}>A rainy-day backup for each day</CheckOption>
                </div>
            </div>
        </div>
    );
}
