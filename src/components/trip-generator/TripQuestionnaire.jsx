import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronRight, ChevronLeft, Sparkles, Loader2, Home } from 'lucide-react';

import WhereWhenStep from './WhereWhenStep';
import FlightsStep from './FlightsStep';
import AccommodationStep from './AccommodationStep';
import StyleStep from './StyleStep';
import GroupBudgetStep from './GroupBudgetStep';
import InterestsFoodStep from './InterestsFoodStep';
import GettingAroundStep from './GettingAroundStep';
import ReviewStep from './ReviewStep';
import { hasDetails } from '../../utils/reservations';
import { tripLengthDays, isAllowedTripLength } from '../../../shared/tripLength.js';
import { blankPreferences, formPreferences, normalizePreferences } from '../../../shared/tripPreferences.js';

const BLANK_FORM_DATA = {
    country: '',
    cities: [
        {
            name: '', checkIn: '', checkOut: '',
            homebaseType: null,
            hotel: { name: '', address: '' },
            customAddress: '',
            hotelAddressStatus: 'idle',
            customAddressStatus: 'idle',
        }
    ],
    travelStyle: '',
    vacationType: '',
    reservations: { flights: [], hotels: [] },
    // The detailed, optional questions (issue #90), all "No preference" to start
    preferences: blankPreferences(),
};

// The questionnaire's steps, in order. `detailed` ones only appear in a Detailed plan
// (a Quick plan is the original five steps).
const STEPS = [
    { id: 'where', title: 'Where & when', Component: WhereWhenStep },
    { id: 'flights', title: 'Flights', Component: FlightsStep },
    { id: 'stay', title: 'Where you\'ll stay', Component: AccommodationStep },
    { id: 'group', title: 'Who\'s going & budget', Component: GroupBudgetStep, detailed: true },
    { id: 'style', title: 'Pace & style', Component: StyleStep },
    { id: 'interests', title: 'Interests & food', Component: InterestsFoodStep, detailed: true },
    { id: 'around', title: 'Getting around & extras', Component: GettingAroundStep, detailed: true },
    { id: 'review', title: 'Review' },
];

const stepsFor = (planDetail) => STEPS.filter((s) => !s.detailed || planDetail === 'detailed');

// Saved drafts (and trips retried from the dashboard) may predate some fields
const withDefaults = (formData) => ({ ...formData, preferences: formPreferences(formData.preferences) });

export default function TripQuestionnaire({ onComplete, isGenerating, initialFormData, initialCountry = "", onHome }) {
    const [step, setStep] = useState(1);
    const [formData, setFormData] = useState(() =>
        initialFormData ? withDefaults(initialFormData) : { ...BLANK_FORM_DATA, preferences: blankPreferences(), country: initialCountry }
    );

    // 1-based `step` indexes into the steps for the chosen plan
    const steps = stepsFor(formData.preferences.planDetail);
    const totalSteps = steps.length;
    const current = steps[Math.min(step, totalSteps) - 1];
    const goTo = (id) => setStep(steps.findIndex((s) => s.id === id) + 1);

    const updateFormData = (updates) => {
        setFormData(prev => ({ ...prev, ...updates }));
    };

    const nextStep = () => {
        if (step < totalSteps) setStep(step + 1);
    };

    const prevStep = () => {
        if (step > 1) setStep(step - 1);
    };

    const handleSubmit = () => {
        // Drop flights that were added but never filled in
        const reservations = { flights: [], hotels: [], ...formData.reservations };
        onComplete({
            ...formData,
            reservations: { ...reservations, flights: reservations.flights.filter(hasDetails) },
            // Only real answers are kept; a Quick plan keeps none
            preferences: normalizePreferences(formData.preferences),
        });
    };

    // Only destination, dates, homebase and style are required; every new question is optional
    const canProceed = () => {
        switch (current.id) {
            case 'where': {
                // Every city needs a name and a check-out after its check-in; whole trip 1 to MAX_TRIP_DAYS days
                const citiesComplete = formData.cities.every(
                    (c) => c.name && c.checkIn && c.checkOut && c.checkOut > c.checkIn
                );
                return formData.country && citiesComplete && isAllowedTripLength(tripLengthDays(formData.cities));
            }
            case 'stay':
                return formData.cities.every(city => {
                    if (city.homebaseType === 'hotel') {
                        return city.hotel.name && city.hotel.address && city.hotelAddressStatus === 'valid';
                    }
                    if (city.homebaseType === 'custom') {
                        return !!city.customAddress && city.customAddressStatus === 'valid';
                    }
                    if (city.homebaseType === 'skip') return true;
                    return false;
                });
            case 'style':
                return formData.travelStyle && formData.vacationType;
            default:
                return true;
        }
    };

    return (
        <div className="min-h-screen bg-gradient-to-br from-indigo-900 via-purple-900 to-pink-800 pt-20 pb-12 sm:py-12 px-4">
            <button
                onClick={() => onHome(formData)}
                disabled={isGenerating}
                className="fixed top-6 left-6 z-50 inline-flex items-center gap-2 rounded-xl px-3 py-2 bg-white/15 text-white backdrop-blur ring-1 ring-white/20 hover:bg-white/25 disabled:opacity-30 disabled:cursor-not-allowed transition text-sm"
            >
                <Home size={16} />
                Home
            </button>

            <div className="max-w-3xl mx-auto">
                {/* Progress Bar */}
                <div className="mb-8">
                    <div className="flex justify-between mb-2">
                        <span className="text-white text-sm font-medium">Step {step} of {totalSteps} · {current.title}</span>
                        <span className="text-white text-sm">{Math.round((step / totalSteps) * 100)}%</span>
                    </div>
                    <div className="h-2 bg-white/20 rounded-full overflow-hidden">
                        <motion.div
                            className="h-full bg-gradient-to-r from-cyan-400 to-blue-500"
                            initial={{ width: 0 }}
                            animate={{ width: `${(step / totalSteps) * 100}%` }}
                            transition={{ duration: 0.3 }}
                        />
                    </div>
                </div>

                {/* Form Content */}
                <AnimatePresence mode="wait">
                    <motion.div
                        key={current.id}
                        initial={{ opacity: 0, x: 20 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: -20 }}
                        transition={{ duration: 0.3 }}
                        className="bg-white rounded-3xl shadow-2xl p-5 sm:p-8"
                    >
                        {current.Component ? (
                            <current.Component formData={formData} updateFormData={updateFormData} />
                        ) : (
                            <ReviewStep formData={formData} steps={steps} onEdit={goTo} />
                        )}
                    </motion.div>
                </AnimatePresence>

                {/* Navigation Buttons */}
                <div className="mt-8 flex justify-between">
                    <button
                        onClick={prevStep}
                        disabled={step === 1 || isGenerating}
                        className="flex items-center gap-2 px-6 py-3 bg-white/10 text-white rounded-xl hover:bg-white/20 disabled:opacity-30 disabled:cursor-not-allowed transition-all"
                    >
                        <ChevronLeft size={20} />
                        Back
                    </button>

                    {step < totalSteps ? (
                        <button
                            onClick={nextStep}
                            disabled={!canProceed() || isGenerating}
                            className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-cyan-500 to-blue-600 text-white rounded-xl hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed transition-all font-semibold"
                        >
                            Next
                            <ChevronRight size={20} />
                        </button>
                    ) : (
                        <button
                            onClick={handleSubmit}
                            disabled={isGenerating}
                            className="flex items-center gap-2 px-8 py-3 bg-gradient-to-r from-pink-500 to-purple-600 text-white rounded-xl hover:shadow-lg transition-all font-bold disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            {isGenerating ? (
                                <>
                                    <Loader2 size={20} className="animate-spin" />
                                    Starting...
                                </>
                            ) : (
                                <>
                                    <Sparkles size={20} />
                                    Generate Itinerary
                                </>
                            )}
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
}