import React from 'react';
import { MapPin, Calendar, Hotel, User, Edit2, Plane, Users, Heart, Bus } from 'lucide-react';
import { getFlights, hasDetails } from '../../utils/reservations';
import { preferenceSummary } from '../../../shared/tripPreferences.js';

// Rows of answers to the detailed questions for one step, "No preference" where skipped
function PreferenceRows({ rows }) {
    if (!rows?.length) return null;
    return (
        <dl className="mt-3 space-y-1.5 border-t border-gray-200 pt-3 text-sm">
            {rows.map(([label, text]) => (
                <div key={label} className="flex flex-col sm:flex-row sm:gap-3">
                    <dt className="font-medium text-gray-700 sm:w-48 sm:flex-none">{label}</dt>
                    <dd className={text === 'No preference' ? 'text-gray-400 italic' : 'text-gray-800'}>{text}</dd>
                </div>
            ))}
        </dl>
    );
}

// A card for one of the detailed-only steps
function PreferenceCard({ title, Icon, stepId, rows, onEdit }) {
    return (
        <div className="border-2 border-gray-100 rounded-xl p-5 bg-gray-50">
            <div className="flex justify-between items-start">
                <div className="flex items-center gap-2">
                    <Icon className="text-indigo-600" size={20} />
                    <h3 className="font-semibold text-gray-900">{title}</h3>
                </div>
                <button onClick={() => onEdit(stepId)} className="min-h-[44px] -my-3 text-indigo-600 hover:text-indigo-700 flex items-center gap-1 text-sm">
                    <Edit2 size={16} />
                    Edit
                </button>
            </div>
            <PreferenceRows rows={rows} />
        </div>
    );
}

// The last step: every answer, with Edit to jump back to its step. `steps` are the steps of
// the chosen plan (a Quick plan has no detailed questions to show).
export default function ReviewStep({ formData, steps = [], onEdit }) {
    const detailed = steps.some((s) => s.id === 'interests');
    const summary = preferenceSummary(formData.preferences);
    const formatDate = (dateStr) => {
        if (!dateStr) return '';
        // A local date: new Date("2030-04-01") is UTC midnight, the day before in the Americas
        const date = new Date(`${dateStr}T00:00:00`);
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
                <h2 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-2">Review your trip</h2>
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
                        onClick={() => onEdit('where')}
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
                        onClick={() => onEdit('where')}
                        className="text-indigo-600 hover:text-indigo-700 flex items-center gap-1 text-sm"
                    >
                        <Edit2 size={16} />
                        Edit
                    </button>
                </div>
                <div className="space-y-3">
                    {formData.cities.map((city, index) => (
                        <div key={index} className="flex justify-between items-center gap-3">
                            <span className="font-medium text-gray-800">{city.name}</span>
                            <span className="text-sm text-gray-600">
                                {formatDate(city.checkIn)} - {formatDate(city.checkOut)}
                            </span>
                        </div>
                    ))}
                </div>
                {detailed && <PreferenceRows rows={summary.where} />}
            </div>

            {/* Flights */}
            <div className="border-2 border-gray-100 rounded-xl p-5 bg-gray-50">
                <div className="flex justify-between items-start mb-3">
                    <div className="flex items-center gap-2">
                        <Plane className="text-indigo-600" size={20} />
                        <h3 className="font-semibold text-gray-900">Flights</h3>
                    </div>
                    <button
                        onClick={() => onEdit('flights')}
                        className="text-indigo-600 hover:text-indigo-700 flex items-center gap-1 text-sm"
                    >
                        <Edit2 size={16} />
                        Edit
                    </button>
                </div>
                {getFlights(formData).some(hasDetails) ? (
                    <div className="space-y-2">
                        {getFlights(formData).filter(hasDetails).map((f) => (
                            <div key={f.id} className="flex justify-between items-center gap-3">
                                <span className="font-medium text-gray-800">
                                    {[f.airline, f.flightNumber].filter(Boolean).join(' ') || 'Flight'}
                                    {(f.from || f.to) && <span className="font-normal text-gray-600"> · {f.from || '?'} → {f.to || '?'}</span>}
                                </span>
                                <span className="text-sm text-gray-600">
                                    {f.confirmationCode ? <span className="font-mono">{f.confirmationCode.toUpperCase()}</span> : formatDate(f.date)}
                                </span>
                            </div>
                        ))}
                    </div>
                ) : (
                    <p className="text-sm text-gray-600 italic">None added — you can add them later from the Reservations tab</p>
                )}
            </div>

            {/* Hotels */}
            <div className="border-2 border-gray-100 rounded-xl p-5 bg-gray-50">
                <div className="flex justify-between items-start mb-3">
                    <div className="flex items-center gap-2">
                        <Hotel className="text-indigo-600" size={20} />
                        <h3 className="font-semibold text-gray-900">Accommodation</h3>
                    </div>
                    <button
                        onClick={() => onEdit('stay')}
                        className="text-indigo-600 hover:text-indigo-700 flex items-center gap-1 text-sm"
                    >
                        <Edit2 size={16} />
                        Edit
                    </button>
                </div>
                <div className="space-y-3">
                    {formData.cities.map((city, index) => (
                        <div key={index}>
                            {city.homebaseType === 'hotel' && (
                                <>
                                    <p className="font-medium text-gray-800">{city.hotel.name}</p>
                                    <p className="text-sm text-gray-600">{city.hotel.address}</p>
                                    {city.hotel.confirmationCode && (
                                        <p className="text-sm text-gray-600">
                                            Confirmation: <span className="font-mono">{city.hotel.confirmationCode.toUpperCase()}</span>
                                        </p>
                                    )}
                                </>
                            )}
                            {city.homebaseType === 'custom' && (
                                <>
                                    <p className="font-medium text-gray-800">Custom address</p>
                                    <p className="text-sm text-gray-600">{city.customAddress}</p>
                                </>
                            )}
                            {city.homebaseType === 'skip' && (
                                <p className="text-sm text-gray-600 italic">
                                    No homebase — generic itinerary for {city.name}
                                </p>
                            )}
                        </div>
                    ))}
                </div>
                {detailed && formData.cities.some((c) => c.homebaseType === 'skip') && <PreferenceRows rows={summary.stay} />}
            </div>

            {detailed && <PreferenceCard title="Who's going & budget" Icon={Users} stepId="group" rows={summary.group} onEdit={onEdit} />}

            {/* Style */}
            <div className="border-2 border-gray-100 rounded-xl p-5 bg-gray-50">
                <div className="flex justify-between items-start mb-3">
                    <div className="flex items-center gap-2">
                        <User className="text-indigo-600" size={20} />
                        <h3 className="font-semibold text-gray-900">Your Style</h3>
                    </div>
                    <button
                        onClick={() => onEdit('style')}
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
                {detailed && <PreferenceRows rows={summary.style} />}
            </div>

            {detailed && <PreferenceCard title="Interests & food" Icon={Heart} stepId="interests" rows={summary.interests} onEdit={onEdit} />}
            {detailed && <PreferenceCard title="Getting around & extras" Icon={Bus} stepId="around" rows={summary.around} onEdit={onEdit} />}
        </div>
    );
}