import React from 'react';
import { Sunrise, Moon, Shuffle, Mountain, Palmtree, Zap, Scale } from 'lucide-react';

export default function StyleStep({ formData, updateFormData }) {
    const travelStyles = [
        {
            id: 'early_bird',
            icon: Sunrise,
            title: 'Early Bird',
            description: 'Start early, relax evenings'
        },
        {
            id: 'night_owl',
            icon: Moon,
            title: 'Night Owl',
            description: 'Slow mornings, active nights'
        },
        {
            id: 'flexible',
            icon: Shuffle,
            title: 'Flexible',
            description: 'Mix of both'
        }
    ];

    const vacationTypes = [
        {
            id: 'relaxation',
            icon: Palmtree,
            title: 'Relaxation',
            description: 'Slow pace, unwind'
        },
        {
            id: 'adventure',
            icon: Mountain,
            title: 'Adventure',
            description: 'Explore everything'
        },
        {
            id: 'constant',
            icon: Zap,
            title: 'Constantly Moving',
            description: 'Packed schedule'
        },
        {
            id: 'balanced',
            icon: Scale,
            title: 'Balanced',
            description: 'Mix of relaxed & exploration'
        }
    ];

    return (
        <div className="space-y-8">
            <div>
                <h2 className="text-3xl font-bold text-gray-900 mb-2">Your travel style</h2>
                <p className="text-gray-600">Help us personalize your itinerary</p>
            </div>

            {/* Travel Style */}
            <div>
                <label className="block text-sm font-semibold text-gray-700 mb-3">
                    What's your travel style? <span className="text-red-500">*</span>
                </label>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                    {travelStyles.map((style) => {
                        const Icon = style.icon;
                        const isSelected = formData.travelStyle === style.id;
                        return (
                            <button
                                key={style.id}
                                onClick={() => updateFormData({ travelStyle: style.id })}
                                className={`p-4 rounded-xl border-2 transition-all text-left ${isSelected
                                        ? 'border-indigo-500 bg-indigo-50 shadow-md'
                                        : 'border-gray-200 hover:border-indigo-300'
                                    }`}
                            >
                                <Icon
                                    size={32}
                                    className={isSelected ? 'text-indigo-600' : 'text-gray-400'}
                                />
                                <h3 className="font-semibold text-gray-900 mt-2">{style.title}</h3>
                                <p className="text-sm text-gray-600 mt-1">{style.description}</p>
                            </button>
                        );
                    })}
                </div>
            </div>

            {/* Vacation Type */}
            <div>
                <label className="block text-sm font-semibold text-gray-700 mb-3">
                    What kind of vacation? <span className="text-red-500">*</span>
                </label>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {vacationTypes.map((type) => {
                        const Icon = type.icon;
                        const isSelected = formData.vacationType === type.id;
                        return (
                            <button
                                key={type.id}
                                onClick={() => updateFormData({ vacationType: type.id })}
                                className={`p-4 rounded-xl border-2 transition-all text-left ${isSelected
                                        ? 'border-purple-500 bg-purple-50 shadow-md'
                                        : 'border-gray-200 hover:border-purple-300'
                                    }`}
                            >
                                <Icon
                                    size={32}
                                    className={isSelected ? 'text-purple-600' : 'text-gray-400'}
                                />
                                <h3 className="font-semibold text-gray-900 mt-2">{type.title}</h3>
                                <p className="text-sm text-gray-600 mt-1">{type.description}</p>
                            </button>
                        );
                    })}
                </div>
            </div>
        </div>
    );
}