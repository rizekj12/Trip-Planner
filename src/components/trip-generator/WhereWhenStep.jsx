import React from 'react';
import { MapPin, Calendar, Plus, X } from 'lucide-react';

export default function WhereWhenStep({ formData, updateFormData }) {
    const addCity = () => {
        updateFormData({
            cities: [
                ...formData.cities,
                { name: '', checkIn: '', checkOut: '', hotel: { name: '', address: '' } }
            ]
        });
    };

    const removeCity = (index) => {
        if (formData.cities.length > 1) {
            const newCities = formData.cities.filter((_, i) => i !== index);
            updateFormData({ cities: newCities });
        }
    };

    const updateCity = (index, field, value) => {
        const newCities = [...formData.cities];
        if (field.includes('.')) {
            const [parent, child] = field.split('.');
            newCities[index][parent][child] = value;
        } else {
            newCities[index][field] = value;
        }
        updateFormData({ cities: newCities });
    };

    return (
        <div className="space-y-6">
            <div>
                <h2 className="text-3xl font-bold text-gray-900 mb-2">Where are you going?</h2>
                <p className="text-gray-600">Tell us about your trip destination and dates</p>
            </div>

            {/* Country */}
            <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Country <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                    <MapPin className="absolute left-3 top-3 text-gray-400" size={20} />
                    <input
                        type="text"
                        value={formData.country}
                        onChange={(e) => updateFormData({ country: e.target.value })}
                        placeholder="e.g., Japan"
                        className="w-full pl-10 pr-4 py-3 border-2 border-gray-200 rounded-xl focus:border-indigo-500 focus:outline-none transition-colors"
                    />
                </div>
            </div>

            {/* Cities */}
            <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Cities & Dates <span className="text-red-500">*</span>
                </label>
                <div className="space-y-4">
                    {formData.cities.map((city, index) => (
                        <div key={index} className="border-2 border-gray-200 rounded-xl p-4 relative">
                            {formData.cities.length > 1 && (
                                <button
                                    onClick={() => removeCity(index)}
                                    className="absolute top-2 right-2 p-1 text-gray-400 hover:text-red-500 transition-colors"
                                >
                                    <X size={20} />
                                </button>
                            )}

                            <div className="mb-3">
                                <input
                                    type="text"
                                    value={city.name}
                                    onChange={(e) => updateCity(index, 'name', e.target.value)}
                                    placeholder="City name (e.g., Tokyo)"
                                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:border-indigo-500 focus:outline-none"
                                />
                            </div>

                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="block text-xs text-gray-600 mb-1">Check-in</label>
                                    <input
                                        type="date"
                                        value={city.checkIn}
                                        onChange={(e) => updateCity(index, 'checkIn', e.target.value)}
                                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:border-indigo-500 focus:outline-none text-sm"
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs text-gray-600 mb-1">Check-out</label>
                                    <input
                                        type="date"
                                        value={city.checkOut}
                                        onChange={(e) => updateCity(index, 'checkOut', e.target.value)}
                                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:border-indigo-500 focus:outline-none text-sm"
                                    />
                                </div>
                            </div>
                        </div>
                    ))}

                    <button
                        onClick={addCity}
                        className="w-full flex items-center justify-center gap-2 py-3 border-2 border-dashed border-gray-300 rounded-xl text-gray-600 hover:border-indigo-500 hover:text-indigo-600 transition-colors"
                    >
                        <Plus size={20} />
                        Add Another City
                    </button>
                </div>
            </div>
        </div>
    );
}