import React from 'react';
import { Zap, ListChecks } from 'lucide-react';
import { usePreferences, inputClass } from './preferenceForm';
import { OptionalField } from './PreferenceInputs';

const PLANS = [
    { id: 'quick', Icon: Zap, title: 'Quick plan', text: 'Just the essentials. Ready in 5 steps.' },
    { id: 'detailed', Icon: ListChecks, title: 'Detailed plan', text: 'Budget, interests, food and more. Everything is optional.' },
];

// End of step 1 (issue #90): Quick or Detailed, and for a detailed plan, when the trip starts
// and ends and where the travelers come from
export default function TripBasics({ formData, updateFormData }) {
    const [p, set] = usePreferences(formData, updateFormData);
    const detailed = p.planDetail === 'detailed';

    return (
        <div className="space-y-6 border-t border-gray-100 pt-6">
            <div>
                <p className="text-sm font-semibold text-gray-700 mb-2">How much should we tailor it?</p>
                <div role="radiogroup" aria-label="Plan detail" className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {PLANS.map((plan) => {
                        const selected = p.planDetail === plan.id;
                        const Icon = plan.Icon;
                        return (
                            <button
                                key={plan.id}
                                type="button"
                                role="radio"
                                aria-checked={selected}
                                onClick={() => set('planDetail', plan.id)}
                                className={`flex items-start gap-3 p-4 rounded-xl border-2 text-left transition-all ${selected ? 'border-indigo-500 bg-indigo-50' : 'border-gray-200 hover:border-indigo-300'}`}
                            >
                                <Icon size={24} className={selected ? 'text-indigo-600 flex-none' : 'text-gray-400 flex-none'} />
                                <span>
                                    <span className="block font-semibold text-gray-900">{plan.title}</span>
                                    <span className="block text-sm text-gray-600">{plan.text}</span>
                                </span>
                            </button>
                        );
                    })}
                </div>
            </div>

            {detailed && (
                <>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                        <OptionalField label="Arrival time, first day" hint="So day 1 isn't overpacked" field={p.arrivalTime} onChange={(f) => set('arrivalTime', f)}>
                            {(value, setValue) => <input type="time" value={value} onChange={(e) => setValue(e.target.value)} aria-label="Arrival time" className={inputClass} />}
                        </OptionalField>
                        <OptionalField label="Departure time, last day" hint="We'll leave time to get there" field={p.departureTime} onChange={(f) => set('departureTime', f)}>
                            {(value, setValue) => <input type="time" value={value} onChange={(e) => setValue(e.target.value)} aria-label="Departure time" className={inputClass} />}
                        </OptionalField>
                    </div>
                    <OptionalField label="Coming from" hint="Home city or airport" field={p.homeAirport} onChange={(f) => set('homeAirport', f)}>
                        {(value, setValue) => (
                            <input type="text" maxLength={100} value={value} onChange={(e) => setValue(e.target.value)} placeholder="e.g. Orlando (MCO)" aria-label="Home city or airport" className={inputClass} />
                        )}
                    </OptionalField>
                </>
            )}
        </div>
    );
}
