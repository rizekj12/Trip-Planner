import React from 'react';
import { MapPin, Calendar, Hotel, User, Edit2 } from 'lucide-react';

export default function ReviewStep({ formData, onEdit }) {
    const formatDate = (dateStr) => {
        if (!dateStr) return '';
        const date = new Date(dateStr);
        return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    };

    const travelStyleLabels = {
        early_bird: 'Early Bird',
        night_owl: 'Night Owl',
        flexible: 'Flexible'
    };

    const vacationTypeLabels = {
        relaxation: 'Relaxation',
        adventure: 'Adventure',
        constant: 'Constantly Moving',
        balanced: 'Balanced'
    };

    return (
        <div className="space-y-6">
            <div>
                <h2 className="text-3xl font-bold text-gray-900 mb-2">Review your trip</h2>
                <p className="text-gray-600">Make sure everything looks good before generating</p>
            </div>

            {/* Destination */}
            <div className="border-2 border-gray-100 rounded-xl p-5 bg-gray-50">
                <div className="flex justify-between items-start mb-3">
                    <div className="flex items-center gap-2">
                        <MapPin className="text-indigo-600" size={20} />
                        <h3 className="font-semibold text-gray-900">Destination</h3>
                    </div>
                    <button
                        onClick={() => onEdit(1)}
                        className="text-indigo-600 hover:text-indigo-700 flex items-center gap-1 text-sm"
                    >
                        <Edit2 size={16} />
                        Edit
                    </button>
                </div>
                <p className="text-lg font-medium text-gray-800">{formData.country}</p>
            </div>

            {/* Cities */}
            <div className="border-2 border-gray-100 rounded-xl p-5 bg-gray-50">
                <div className="flex justify-between items-start mb-3">
                    <div className="flex items-center gap-2">
                        <Calendar className="text-indigo-600" size={20} />
                        <h3 className="font-semibold text-gray-900">Cities & Dates</h3>
                    </div>
                    <button
                        onClick={() => onEdit(1)}
                        className="text-indigo-600 hover:text-indigo-700 flex items-center gap-1 text-sm"
                    >
                        <Edit2 size={16} />
                        Edit
                    </button>
                </div>
                <div className="space-y-3">
                    {formData.cities.map((city, index) => (
                        <div key={index} className="flex justify-between items-center">
                            <span className="font-medium text-gray-800">{city.name}</span>
                            <span className="text-sm text-gray-600">
                                {formatDate(city.checkIn)} - {formatDate(city.checkOut)}
                            </span>
                        </div>
                    ))}
                </div>
            </div>

            {/* Hotels */}
            <div className="border-2 border-gray-100 rounded-xl p-5 bg-gray-50">
                <div className="flex justify-between items-start mb-3">
                    <div className="flex items-center gap-2">
                        <Hotel className="text-indigo-600" size={20} />
                        <h3 className="font-semibold text-gray-900">Accommodation</h3>
                    </div>
                    <button
                        onClick={() => onEdit(2)}
                        className="text-indigo-600 hover:text-indigo-700 flex items-center gap-1 text-sm"
                    >
                        <Edit2 size={16} />
                        Edit
                    </button>
                </div>
                <div className="space-y-3">
                    {formData.cities.map((city, index) => (
                        <div key={index}>
                            <p className="font-medium text-gray-800">{city.hotel.name}</p>
                            <p className="text-sm text-gray-600">{city.hotel.address}</p>
                        </div>
                    ))}
                </div>
            </div>

            {/* Style */}
            <div className="border-2 border-gray-100 rounded-xl p-5 bg-gray-50">
                <div className="flex justify-between items-start mb-3">
                    <div className="flex items-center gap-2">
                        <User className="text-indigo-600" size={20} />
                        <h3 className="font-semibold text-gray-900">Your Style</h3>
                    </div>
                    <button
                        onClick={() => onEdit(3)}
                        className="text-indigo-600 hover:text-indigo-700 flex items-center gap-1 text-sm"
                    >
                        <Edit2 size={16} />
                        Edit
                    </button>
                </div>
                <div className="space-y-2">
                    <p className="text-gray-800">
                        <span className="font-medium">Travel style:</span> {travelStyleLabels[formData.travelStyle]}
                    </p>
                    <p className="text-gray-800">
                        <span className="font-medium">Vacation type:</span> {vacationTypeLabels[formData.vacationType]}
                    </p>
                </div>
            </div>
        </div>
    );
}