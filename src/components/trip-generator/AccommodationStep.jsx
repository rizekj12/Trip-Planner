import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Hotel, MapPinned, SkipForward, AlertTriangle, Search, Loader2 } from 'lucide-react';
import HotelSearchModal from './HotelSearchModal';
import { validateAddress } from '../../utils/addressValidation';

const HOMEBASE_OPTIONS = [
    { value: 'hotel', label: 'Hotel', icon: Hotel },
    { value: 'custom', label: 'Custom Address', icon: MapPinned },
    { value: 'skip', label: 'Skip', icon: SkipForward },
];

function addressBorderClass(status) {
    if (status === 'invalid') return 'border-red-400 focus:border-red-500';
    if (status === 'valid') return 'border-green-400 focus:border-green-500';
    return 'border-gray-200 focus:border-indigo-500';
}

export default function AccommodationStep({ formData, updateFormData }) {
    const [skipConfirmIndex, setSkipConfirmIndex] = useState(null);
    const [hotelSearchIndex, setHotelSearchIndex] = useState(null);
    const [lastChecked, setLastChecked] = useState({});

    const patchCity = (index, patch) => {
        const newCities = [...formData.cities];
        const current = newCities[index];
        newCities[index] = {
            ...current,
            ...patch,
            ...(patch.hotel ? { hotel: { ...current.hotel, ...patch.hotel } } : {}),
        };
        updateFormData({ cities: newCities });
    };

    const updateCityField = (index, updates) => patchCity(index, updates);
    const updateHotel = (index, fields) => patchCity(index, { hotel: fields });

    const validateCityAddress = async (index, kind) => {
        const city = formData.cities[index];
        const address = kind === 'hotel' ? city.hotel.address : city.customAddress;
        const statusField = kind === 'hotel' ? 'hotelAddressStatus' : 'customAddressStatus';
        const cacheKey = `${index}-${kind}`;

        if (!address?.trim()) {
            patchCity(index, { [statusField]: 'idle' });
            return;
        }
        if (lastChecked[cacheKey] === address) return;

        patchCity(index, { [statusField]: 'checking' });
        try {
            const result = await validateAddress(address);
            setLastChecked((prev) => ({ ...prev, [cacheKey]: address }));
            patchCity(index, { [statusField]: result.valid ? 'valid' : 'invalid' });
        } catch {
            // Our own validation service failing shouldn't block the user
            setLastChecked((prev) => ({ ...prev, [cacheKey]: address }));
            patchCity(index, { [statusField]: 'valid' });
        }
    };

    useEffect(() => {
        formData.cities.forEach((city, index) => {
            if (city.homebaseType === 'hotel' && city.hotel.address && city.hotelAddressStatus !== 'valid') {
                validateCityAddress(index, 'hotel');
            }
            if (city.homebaseType === 'custom' && city.customAddress && city.customAddressStatus !== 'valid') {
                validateCityAddress(index, 'custom');
            }
        });
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const handleTypeSelect = (index, type) => {
        if (type === 'skip') {
            setSkipConfirmIndex(index);
            return;
        }
        updateCityField(index, { homebaseType: type });
    };

    const confirmSkip = () => {
        updateCityField(skipConfirmIndex, { homebaseType: 'skip' });
        setSkipConfirmIndex(null);
    };

    return (
        <div className="space-y-6">
            <div>
                <h2 className="text-3xl font-bold text-gray-900 mb-2">Where will you be staying?</h2>
                <p className="text-gray-600">This helps us tailor each day's itinerary around your homebase</p>
            </div>

            <div className="space-y-6">
                {formData.cities.map((city, index) => (
                    <div key={index} className="border-2 border-indigo-100 rounded-xl p-5 bg-indigo-50/30">
                        <div className="flex items-center gap-2 mb-4">
                            <Hotel className="text-indigo-600" size={24} />
                            <h3 className="text-xl font-semibold text-gray-900">{city.name || `City ${index + 1}`}</h3>
                        </div>

                        {/* Homebase type selector */}
                        <div className="grid grid-cols-3 gap-2 mb-4">
                            {HOMEBASE_OPTIONS.map(({ value, label, icon: Icon }) => (
                                <button
                                    key={value}
                                    type="button"
                                    onClick={() => handleTypeSelect(index, value)}
                                    className={`flex flex-col items-center gap-1 px-3 py-3 rounded-lg border-2 text-sm font-medium transition-colors ${
                                        city.homebaseType === value
                                            ? 'border-indigo-500 bg-indigo-100 text-indigo-700'
                                            : 'border-gray-200 bg-white text-gray-600 hover:border-indigo-300'
                                    }`}
                                >
                                    <Icon size={18} />
                                    {label}
                                </button>
                            ))}
                        </div>

                        {city.homebaseType === 'hotel' && (
                            <div className="space-y-3">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                        Hotel Name <span className="text-red-500">*</span>
                                    </label>
                                    <div className="flex gap-2">
                                        <input
                                            type="text"
                                            value={city.hotel.name}
                                            onChange={(e) => updateHotel(index, { name: e.target.value })}
                                            placeholder="e.g., NOHGA Hotel Akihabara"
                                            className="flex-1 px-4 py-3 border-2 border-gray-200 rounded-lg focus:border-indigo-500 focus:outline-none"
                                        />
                                        <button
                                            type="button"
                                            onClick={() => setHotelSearchIndex(index)}
                                            disabled={!city.name}
                                            title={!city.name ? 'Enter a city first' : 'Search hotels'}
                                            className="flex-shrink-0 flex items-center gap-1.5 px-4 py-3 rounded-lg border-2 border-indigo-200 text-indigo-700 font-medium hover:bg-indigo-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                                        >
                                            <Search size={16} />
                                            Search Hotels
                                        </button>
                                    </div>
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                        Address <span className="text-red-500">*</span>
                                    </label>
                                    <input
                                        type="text"
                                        value={city.hotel.address}
                                        onChange={(e) => patchCity(index, { hotel: { address: e.target.value }, hotelAddressStatus: 'idle' })}
                                        onBlur={() => validateCityAddress(index, 'hotel')}
                                        placeholder="e.g., 3-10-11 Sotokanda, Tokyo 110-0021"
                                        className={`w-full px-4 py-3 border-2 rounded-lg focus:outline-none ${addressBorderClass(city.hotelAddressStatus)}`}
                                    />
                                    {city.hotelAddressStatus === 'checking' && (
                                        <p className="text-xs text-gray-500 mt-1 flex items-center gap-1">
                                            <Loader2 size={12} className="animate-spin" />
                                            Checking address…
                                        </p>
                                    )}
                                    {city.hotelAddressStatus === 'invalid' && (
                                        <p className="text-xs text-red-600 mt-1">
                                            Address cannot be found. Please choose a valid address.
                                        </p>
                                    )}
                                </div>

                                <div className="text-xs text-gray-500 mt-2">
                                    💡 Tip: We'll use this to calculate directions for each day
                                </div>
                            </div>
                        )}

                        {city.homebaseType === 'custom' && (
                            <div className="space-y-3">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                        Address <span className="text-red-500">*</span>
                                    </label>
                                    <input
                                        type="text"
                                        value={city.customAddress}
                                        onChange={(e) => patchCity(index, { customAddress: e.target.value, customAddressStatus: 'idle' })}
                                        onBlur={() => validateCityAddress(index, 'custom')}
                                        placeholder="e.g., 123 Main St, Tokyo"
                                        className={`w-full px-4 py-3 border-2 rounded-lg focus:outline-none ${addressBorderClass(city.customAddressStatus)}`}
                                    />
                                    {city.customAddressStatus === 'checking' && (
                                        <p className="text-xs text-gray-500 mt-1 flex items-center gap-1">
                                            <Loader2 size={12} className="animate-spin" />
                                            Checking address…
                                        </p>
                                    )}
                                    {city.customAddressStatus === 'invalid' && (
                                        <p className="text-xs text-red-600 mt-1">
                                            Address cannot be found. Please choose a valid address.
                                        </p>
                                    )}
                                </div>
                                <div className="text-xs text-gray-500 mt-2">
                                    💡 We'll drop a pin here and plan each day's directions around it
                                </div>
                            </div>
                        )}

                        {city.homebaseType === 'skip' && (
                            <div className="text-sm text-gray-600 bg-white border-2 border-dashed border-gray-200 rounded-lg px-4 py-3">
                                No homebase set — we'll build a generic itinerary for {city.name || 'this city'}.
                            </div>
                        )}
                    </div>
                ))}
            </div>

            {/* Skip confirmation modal */}
            <AnimatePresence>
                {skipConfirmIndex !== null && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 px-4"
                        onClick={() => setSkipConfirmIndex(null)}
                    >
                        <motion.div
                            initial={{ opacity: 0, scale: 0.95, y: 10 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.95, y: 10 }}
                            onClick={(e) => e.stopPropagation()}
                            className="bg-white rounded-2xl shadow-2xl max-w-sm w-full p-6"
                        >
                            <div className="flex items-center gap-3 mb-3">
                                <div className="w-10 h-10 rounded-full bg-amber-100 flex items-center justify-center flex-shrink-0">
                                    <AlertTriangle className="text-amber-600" size={20} />
                                </div>
                                <h3 className="text-lg font-bold text-gray-900">Skip your homebase?</h3>
                            </div>
                            <p className="text-sm text-gray-600 mb-6">
                                Without a homebase, we can't plan each day's route around where you're staying —
                                you'll get a general itinerary for the city instead of one built around your
                                location. You can always add it back later.
                            </p>
                            <div className="flex gap-3">
                                <button
                                    onClick={() => setSkipConfirmIndex(null)}
                                    className="flex-1 px-4 py-2.5 rounded-xl border-2 border-gray-200 text-gray-700 font-medium hover:bg-gray-50 transition-colors"
                                >
                                    Go back
                                </button>
                                <button
                                    onClick={confirmSkip}
                                    className="flex-1 px-4 py-2.5 rounded-xl bg-amber-500 text-white font-semibold hover:bg-amber-600 transition-colors"
                                >
                                    Skip it
                                </button>
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Hotel search modal */}
            <AnimatePresence>
                {hotelSearchIndex !== null && (
                    <HotelSearchModal
                        city={formData.cities[hotelSearchIndex].name}
                        country={formData.country}
                        onClose={() => setHotelSearchIndex(null)}
                        onSelect={(hotel) => {
                            patchCity(hotelSearchIndex, {
                                hotel: { name: hotel.name, address: hotel.address },
                                hotelAddressStatus: 'valid',
                            });
                            setLastChecked((prev) => ({ ...prev, [`${hotelSearchIndex}-hotel`]: hotel.address }));
                            setHotelSearchIndex(null);
                        }}
                    />
                )}
            </AnimatePresence>
        </div>
    );
}
