import React, { useState, useRef, useEffect } from 'react';
import { MapPin, Calendar, Plus, X, ChevronDown } from 'lucide-react';
import { COUNTRIES, CITIES_BY_COUNTRY } from '../../data/countriesAndCities';

function CityAutocomplete({ value, onChange, country, placeholder }) {
    const [open, setOpen] = useState(false);
    const [query, setQuery] = useState(value);
    const containerRef = useRef(null);

    const cities = country ? (CITIES_BY_COUNTRY[country] || []) : [];
    const suggestions = query.length > 0
        ? cities.filter(c => c.toLowerCase().includes(query.toLowerCase())).slice(0, 8)
        : cities.slice(0, 8);

    useEffect(() => { setQuery(value); }, [value]);

    useEffect(() => {
        const handler = (e) => {
            if (containerRef.current && !containerRef.current.contains(e.target)) {
                setOpen(false);
            }
        };
        document.addEventListener('mousedown', handler);
        return () => document.removeEventListener('mousedown', handler);
    }, []);

    const handleSelect = (city) => {
        setQuery(city);
        onChange(city);
        setOpen(false);
    };

    const handleChange = (e) => {
        setQuery(e.target.value);
        onChange(e.target.value);
        setOpen(true);
    };

    return (
        <div ref={containerRef} className="relative">
            <input
                type="text"
                value={query}
                onChange={handleChange}
                onFocus={() => setOpen(true)}
                placeholder={country ? placeholder : 'Select a country first'}
                disabled={!country}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:border-indigo-500 focus:outline-none disabled:bg-gray-50 disabled:text-gray-400"
            />
            {open && suggestions.length > 0 && (
                <ul className="absolute z-50 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg max-h-52 overflow-y-auto">
                    {suggestions.map(city => (
                        <li
                            key={city}
                            onMouseDown={() => handleSelect(city)}
                            className="px-4 py-2 text-sm text-gray-800 hover:bg-indigo-50 hover:text-indigo-700 cursor-pointer"
                        >
                            {city}
                        </li>
                    ))}
                </ul>
            )}
        </div>
    );
}

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
            updateFormData({ cities: formData.cities.filter((_, i) => i !== index) });
        }
    };

    const updateCity = (index, field, value) => {
        const newCities = [...formData.cities];
        if (field.includes('.')) {
            const [parent, child] = field.split('.');
            newCities[index] = { ...newCities[index], [parent]: { ...newCities[index][parent], [child]: value } };
        } else {
            newCities[index] = { ...newCities[index], [field]: value };
        }
        updateFormData({ cities: newCities });
    };

    const handleCountryChange = (country) => {
        updateFormData({
            country,
            cities: formData.cities.map(c => ({ ...c, name: '' })),
        });
    };

    return (
        <div className="space-y-6">
            <div>
                <h2 className="text-3xl font-bold text-gray-900 mb-2">Where are you going?</h2>
                <p className="text-gray-600">Tell us about your trip destination and dates</p>
            </div>

            {/* Country dropdown */}
            <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Country <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                    <MapPin className="absolute left-3 top-3 text-gray-400 pointer-events-none" size={20} />
                    <select
                        value={formData.country}
                        onChange={(e) => handleCountryChange(e.target.value)}
                        className="w-full pl-10 pr-10 py-3 border-2 border-gray-200 rounded-xl focus:border-indigo-500 focus:outline-none transition-colors appearance-none bg-white text-gray-900"
                    >
                        <option value="">Select a country…</option>
                        {COUNTRIES.map(c => (
                            <option key={c} value={c}>{c}</option>
                        ))}
                    </select>
                    <ChevronDown className="absolute right-3 top-3.5 text-gray-400 pointer-events-none" size={18} />
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
                                <CityAutocomplete
                                    value={city.name}
                                    onChange={(val) => updateCity(index, 'name', val)}
                                    country={formData.country}
                                    placeholder="City name (e.g., Tokyo)"
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
