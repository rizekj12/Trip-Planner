import React from 'react';
import { Plane, Plus, X, Info } from 'lucide-react';
import { FlightFields } from '../reservations/ReservationFields';
import { BLANK_FLIGHT, newReservationId } from '../../utils/reservations';

// Optional step: flight details and confirmation codes. Blank flights are dropped on submit.
export default function FlightsStep({ formData, updateFormData }) {
    const reservations = { flights: [], hotels: [], ...formData.reservations };
    const flights = reservations.flights;

    const setFlights = (next) => updateFormData({ reservations: { ...reservations, flights: next } });
    const addFlight = () => setFlights([...flights, { ...BLANK_FLIGHT, id: newReservationId() }]);
    const updateFlight = (id, patch) => setFlights(flights.map((f) => (f.id === id ? { ...f, ...patch } : f)));
    const removeFlight = (id) => setFlights(flights.filter((f) => f.id !== id));

    return (
        <div className="space-y-6">
            <div>
                <h2 className="text-3xl font-bold text-gray-900 mb-2">Do you have your flights?</h2>
                <p className="text-gray-600">Add your flight details and confirmation codes to keep them with your trip</p>
            </div>

            <div className="flex items-start gap-2 rounded-xl bg-indigo-50 px-4 py-3 text-sm text-indigo-800">
                <Info size={18} className="mt-0.5 flex-shrink-0" />
                <span>
                    This step is optional. Don't have them yet? You can skip it and add flights later
                    from the <strong>Reservations</strong> tab in your itinerary.
                </span>
            </div>

            {flights.map((flight, index) => (
                <div key={flight.id} className="border-2 border-gray-200 rounded-xl p-4">
                    <div className="flex items-center justify-between mb-3">
                        <span className="inline-flex items-center gap-2 text-sm font-semibold text-gray-700">
                            <Plane size={16} className="text-indigo-600" />
                            Flight {index + 1}
                        </span>
                        <button
                            type="button"
                            onClick={() => removeFlight(flight.id)}
                            className="inline-flex items-center gap-1 rounded-lg px-2 py-1 text-sm text-gray-500 hover:bg-red-50 hover:text-red-600 transition-colors"
                            aria-label={`Remove flight ${index + 1}`}
                        >
                            <X size={16} />
                            Remove
                        </button>
                    </div>
                    <FlightFields value={flight} onChange={(patch) => updateFlight(flight.id, patch)} />
                </div>
            ))}

            <button
                type="button"
                onClick={addFlight}
                className="w-full flex items-center justify-center gap-2 py-3 border-2 border-dashed border-gray-300 rounded-xl text-gray-600 hover:border-indigo-500 hover:text-indigo-600 transition-colors"
            >
                <Plus size={20} />
                {flights.length ? 'Add Another Flight' : 'Add a Flight'}
            </button>
        </div>
    );
}
