import React from 'react';
import { Hotel } from 'lucide-react';

export default function AccommodationStep({ formData, updateFormData }) {
    const updateHotel = (index, field, value) => {
        const newCities = [...formData.cities];
        newCities[index].hotel[field] = value;
        updateFormData({ cities: newCities });
    };

    return (
        <div className="space-y-6">
            <div>
                <h2 className="text-3xl font-bold text-gray-900 mb-2">Where are you staying?</h2>
                <p className="text-gray-600">Hotel or accommodation for each city</p>
            </div>

            <div className="space-y-6">
                {formData.cities.map((city, index) => (
                    <div key={index} className="border-2 border-indigo-100 rounded-xl p-5 bg-indigo-50/30">
                        <div className="flex items-center gap-2 mb-4">
                            <Hotel className="text-indigo-600" size={24} />
                            <h3 className="text-xl font-semibold text-gray-900">{city.name || `City ${index + 1}`}</h3>
                        </div>

                        <div className="space-y-3">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    Hotel Name <span className="text-red-500">*</span>
                                </label>
                                <input
                                    type="text"
                                    value={city.hotel.name}
                                    onChange={(e) => updateHotel(index, 'name', e.target.value)}
                                    placeholder="e.g., NOHGA Hotel Akihabara"
                                    className="w-full px-4 py-3 border-2 border-gray-200 rounded-lg focus:border-indigo-500 focus:outline-none"
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    Address <span className="text-red-500">*</span>
                                </label>
                                <input
                                    type="text"
                                    value={city.hotel.address}
                                    onChange={(e) => updateHotel(index, 'address', e.target.value)}
                                    placeholder="e.g., 3-10-11 Sotokanda, Tokyo 110-0021"
                                    className="w-full px-4 py-3 border-2 border-gray-200 rounded-lg focus:border-indigo-500 focus:outline-none"
                                />
                            </div>

                            <div className="text-xs text-gray-500 mt-2">
                                💡 Tip: We'll use this to calculate directions for each day
                            </div>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}