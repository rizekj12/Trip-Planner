import React from 'react';
import { GROUP_TYPES, AGE_GROUPS, CURRENCIES, BUDGET_PARTS } from '../../../shared/tripPreferences.js';
import { usePreferences, inputClass } from './preferenceForm';
import { StepHeading, OptionalField, SingleChips, MultiChips, Stepper, CheckOption } from './PreferenceInputs';

// Who's going and what they want to spend (issue #90). Every question is optional.
export default function GroupBudgetStep({ formData, updateFormData }) {
    const [p, set] = usePreferences(formData, updateFormData);

    return (
        <div className="space-y-7">
            <StepHeading title="Who's going & budget" subtitle="All optional. Skip anything you don't mind about." />

            <OptionalField label="Who's going?" field={p.groupType} onChange={(f) => set('groupType', f)}>
                {(value, setValue) => <SingleChips label="Group type" options={GROUP_TYPES} value={value} onChange={setValue} />}
            </OptionalField>

            <OptionalField label="How many travelers?" field={p.travelers} onChange={(f) => set('travelers', f)}>
                {(value, setValue) => (
                    <div className="rounded-xl border-2 border-gray-200 px-4 py-2 divide-y divide-gray-100">
                        {AGE_GROUPS.map(([key, label]) => (
                            <Stepper key={key} label={label} value={value[key] || 0} onChange={(n) => setValue({ ...value, [key]: n })} />
                        ))}
                    </div>
                )}
            </OptionalField>

            <CheckOption checked={p.pets} onChange={(v) => set('pets', v)} hint="We'll pick pet-friendly places">
                Traveling with a pet
            </CheckOption>

            <OptionalField label="Budget" hint="A rough range is plenty" field={p.budget} onChange={(f) => set('budget', f)}>
                {(value, setValue) => (
                    <div className="space-y-3">
                        <div role="radiogroup" aria-label="Budget is" className="inline-flex rounded-xl border-2 border-gray-200 p-1">
                            {[['total', 'Whole trip'], ['day', 'Per day']].map(([id, label]) => (
                                <button
                                    key={id}
                                    type="button"
                                    role="radio"
                                    aria-checked={value.per === id}
                                    onClick={() => setValue({ ...value, per: id })}
                                    className={`min-h-[40px] px-4 rounded-lg text-sm font-medium ${value.per === id ? 'bg-indigo-600 text-white' : 'text-gray-700'}`}
                                >
                                    {label}
                                </button>
                            ))}
                        </div>
                        <div className="grid grid-cols-[1fr_1fr_auto] gap-2 items-end">
                            <label className="text-xs text-gray-600">
                                From
                                <input type="number" inputMode="numeric" min={0} value={value.min} onChange={(e) => setValue({ ...value, min: e.target.value })} placeholder="0" className={`${inputClass} mt-1`} />
                            </label>
                            <label className="text-xs text-gray-600">
                                Up to
                                <input type="number" inputMode="numeric" min={0} value={value.max} onChange={(e) => setValue({ ...value, max: e.target.value })} placeholder="2000" className={`${inputClass} mt-1`} />
                            </label>
                            <label className="text-xs text-gray-600">
                                <span className="sr-only">Currency</span>
                                <select value={value.currency} onChange={(e) => setValue({ ...value, currency: e.target.value })} className={`${inputClass} mt-1 pr-8`}>
                                    {CURRENCIES.map((c) => <option key={c}>{c}</option>)}
                                </select>
                            </label>
                        </div>
                        {value.min !== '' && value.max !== '' && Number(value.min) > Number(value.max) && (
                            <p className="text-xs text-amber-700">"From" is more than "Up to", so the budget will be treated as no preference.</p>
                        )}
                    </div>
                )}
            </OptionalField>

            <OptionalField label="What does the budget cover?" field={p.budgetCovers} onChange={(f) => set('budgetCovers', f)}>
                {(value, setValue) => <MultiChips label="Budget covers" options={BUDGET_PARTS} value={value} onChange={setValue} />}
            </OptionalField>

            <OptionalField label="Splurge or save?" hint='e.g. "splurge on food, save on hotels"' field={p.splurgeSave} onChange={(f) => set('splurgeSave', f)}>
                {(value, setValue) => (
                    <div className="space-y-3">
                        <div>
                            <p className="text-xs font-semibold text-gray-600 mb-1.5">Splurge on</p>
                            <MultiChips label="Splurge on" options={BUDGET_PARTS} value={value.splurge} disabledIds={value.save} onChange={(splurge) => setValue({ ...value, splurge })} />
                        </div>
                        <div>
                            <p className="text-xs font-semibold text-gray-600 mb-1.5">Save on</p>
                            <MultiChips label="Save on" options={BUDGET_PARTS} value={value.save} disabledIds={value.splurge} onChange={(save) => setValue({ ...value, save })} />
                        </div>
                    </div>
                )}
            </OptionalField>
        </div>
    );
}
