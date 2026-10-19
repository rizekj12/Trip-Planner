import React, { useState, useEffect } from 'react';
import { Plus, X } from 'lucide-react';
import { CITIES_BY_COUNTRY } from '../../data/countriesAndCities';
import DestinationPicker from './DestinationPicker';
import TripBasics from './TripBasics';
import { MAX_TRIP_DAYS, tripLengthDays, latestCheckOut } from '../../../shared/tripLength.js';
import { useClickOutside } from '../../hooks/useClickOutside';

function getTodayStr() {
    const now = new Date();
    const offset = now.getTimezoneOffset();
    return new Date(now.getTime() - offset * 60000).toISOString().split('T')[0];
}

function CityAutocomplete({ value, onChange, country, placeholder }) {
    const [open, setOpen] = useState(false);
    const [query, setQuery] = useState(value);
    const containerRef = useClickOutside(() => setOpen(false));

    const cities = country ? (CITIES_BY_COUNTRY[country] || []) : [];
    const suggestions = query.length > 0
        ? cities.filter(c => c.toLowerCase().includes(query.toLowerCase())).slice(0, 8)
        : cities.slice(0, 8);

    useEffect(() => { setQuery(value); }, [value]);

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
                placeholder={country ? placeholder : 'Select a destination first'}
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
    const todayStr = getTodayStr();
    const tripDays = tripLengthDays(formData.cities);
    const tooLong = tripDays !== null && tripDays > MAX_TRIP_DAYS;
    // Check-out dates can't go past the earliest check-in + MAX_TRIP_DAYS
    const maxCheckOut = latestCheckOut(formData.cities) || undefined;

    const addCity = () => {
        updateFormData({
            cities: [
                ...formData.cities,
                {
                    name: '', checkIn: '', checkOut: '',
                    homebaseType: null,
                    hotel: { name: '', address: '' },
                    customAddress: '',
                    hotelAddressStatus: 'idle',
                    customAddressStatus: 'idle',
                }
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

            {/* Destination: type to search, must pick from the list */}
            <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Country / territory <span className="text-red-500">*</span>
                </label>
                <DestinationPicker value={formData.country} onChange={handleCountryChange} />
            </div>

            {/* Cities */}
            <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Cities & Dates <span className="text-red-500">*</span>
                </label>
                <div className="space-y-4">
                    {formData.cities.map((city, index) => (
                        <div key={index} className="border-2 border-gray-200 rounded-xl p-4">
                            {formData.cities.length > 1 && (
                                <div className="flex items-center justify-between mb-2">
                                    <span className="text-xs font-semibold uppercase tracking-wide text-gray-500">
                                        City {index + 1}
                                    </span>
                                    <button
                                        type="button"
                                        onClick={() => removeCity(index)}
                                        className="inline-flex items-center gap-1 rounded-lg px-2 py-1 text-sm text-gray-500 hover:bg-red-50 hover:text-red-600 transition-colors"
                                        aria-label={`Remove city ${index + 1}`}
                                    >
                                        <X size={16} />
                                        Remove
                                    </button>
                                </div>
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
                                        min={todayStr}
                                        onChange={(e) => updateCity(index, 'checkIn', e.target.value)}
                                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:border-indigo-500 focus:outline-none text-sm"
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs text-gray-600 mb-1">Check-out</label>
                                    <input
                                        type="date"
                                        value={city.checkOut}
                                        min={city.checkIn || todayStr}
                                        max={maxCheckOut}
                                        onChange={(e) => updateCity(index, 'checkOut', e.target.value)}
                                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:border-indigo-500 focus:outline-none text-sm"
                                    />
                                </div>
                            </div>
                            {city.checkIn && city.checkOut && city.checkOut <= city.checkIn && (
                                <p className="mt-2 text-xs text-red-600">Check-out must be after check-in.</p>
                            )}
                        </div>
                    ))}

                    <button
                        onClick={addCity}
                        className="w-full flex items-center justify-center gap-2 py-3 border-2 border-dashed border-gray-300 rounded-xl text-gray-600 hover:border-indigo-500 hover:text-indigo-600 transition-colors"
                    >
                        <Plus size={20} />
                        Add Another City
                    </button>

                    {tripDays !== null && (
                        <p className={`text-sm ${tooLong ? 'text-red-600 font-medium' : 'text-gray-500'}`}>
                            {tooLong
                                ? `Your trip is ${tripDays} days. Trips can be up to ${MAX_TRIP_DAYS} days — please shorten your dates.`
                                : `Trip length: ${tripDays} day${tripDays === 1 ? '' : 's'} (up to ${MAX_TRIP_DAYS})`}
                        </p>
                    )}
                </div>
            </div>

            <TripBasics formData={formData} updateFormData={updateFormData} />
        </div>
    );
}
