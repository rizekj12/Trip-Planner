import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronRight, ChevronLeft, Sparkles, Loader2 } from 'lucide-react';

import WhereWhenStep from './WhereWhenStep';
import AccommodationStep from './AccommodationStep';
import StyleStep from './StyleStep';
import ReviewStep from './ReviewStep';

export default function TripQuestionnaire({ onComplete, isGenerating }) {
    const [step, setStep] = useState(1);
    const [formData, setFormData] = useState({
        country: '',
        cities: [
            { name: '', checkIn: '', checkOut: '', hotel: { name: '', address: '' } }
        ],
        travelStyle: '',
        vacationType: ''
    });

    const totalSteps = 4;

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
        onComplete(formData);
    };

    const canProceed = () => {
        switch (step) {
            case 1:
                return formData.country && formData.cities[0].name && formData.cities[0].checkIn && formData.cities[0].checkOut;
            case 2:
                return formData.cities.every(city => city.hotel.name && city.hotel.address);
            case 3:
                return formData.travelStyle && formData.vacationType;
            case 4:
                return true;
            default:
                return false;
        }
    };

    return (
        <div className="min-h-screen bg-gradient-to-br from-indigo-900 via-purple-900 to-pink-800 py-12 px-4">
            <div className="max-w-3xl mx-auto">
                {/* Progress Bar */}
                <div className="mb-8">
                    <div className="flex justify-between mb-2">
                        <span className="text-white text-sm font-medium">Step {step} of {totalSteps}</span>
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
                        key={step}
                        initial={{ opacity: 0, x: 20 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: -20 }}
                        transition={{ duration: 0.3 }}
                        className="bg-white rounded-3xl shadow-2xl p-8"
                    >
                        {step === 1 && (
                            <WhereWhenStep
                                formData={formData}
                                updateFormData={updateFormData}
                            />
                        )}
                        {step === 2 && (
                            <AccommodationStep
                                formData={formData}
                                updateFormData={updateFormData}
                            />
                        )}
                        {step === 3 && (
                            <StyleStep
                                formData={formData}
                                updateFormData={updateFormData}
                            />
                        )}
                        {step === 4 && (
                            <ReviewStep
                                formData={formData}
                                onEdit={(stepNum) => setStep(stepNum)}
                            />
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
                                    Generating...
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

                {/* Generating Message */}
                {isGenerating && (
                    <motion.div
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="mt-6 text-center"
                    >
                        <p className="text-white text-sm">
                            ✨ Claude is crafting your perfect itinerary...
                        </p>
                        <p className="text-white/60 text-xs mt-1">
                            This usually takes 10-20 seconds
                        </p>
                    </motion.div>
                )}
            </div>
        </div>
    );
}