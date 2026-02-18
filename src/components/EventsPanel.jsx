import React, { useState } from 'react';
import { Calendar, MapPin, ExternalLink } from 'lucide-react';
import EventModal from './EventModal';

export default function EventsPanel({ events, theme }) {
    const [selectedEvent, setSelectedEvent] = useState(null);
    const [isModalOpen, setIsModalOpen] = useState(false);

    const handleEventClick = (event) => {
        setSelectedEvent(event);
        setIsModalOpen(true);
    };

    const closeModal = () => {
        setIsModalOpen(false);
        setTimeout(() => setSelectedEvent(null), 300);
    };

    return (
        <>
            <div className={`rounded-2xl p-6 shadow-xl ${theme.card}`}>
                {/* Header */}
                <div className={`mb-6 rounded-xl p-4 ${theme.header}`}>
                    <h2 className="text-2xl font-semibold">Local Events</h2>
                    <p className="text-sm opacity-80 mt-1">Happening during your trip</p>
                </div>

                {/* Events List */}
                <div className="space-y-4">
                    {events.map((event) => (
                        <button
                            key={event.id}
                            onClick={() => handleEventClick(event)}
                            className={`w-full text-left rounded-xl p-4 transition-all hover:shadow-md ${theme.sub} hover:scale-[1.02] group`}
                        >
                            <div className="flex gap-4">
                                {/* Event Image Thumbnail */}
                                {event.image && (
                                    <div className="flex-shrink-0 w-20 h-20 rounded-lg overflow-hidden bg-gray-200">
                                        <img
                                            src={event.image}
                                            alt={event.title}
                                            className="w-full h-full object-cover"
                                        />
                                    </div>
                                )}

                                {/* Event Details */}
                                <div className="flex-1 min-w-0">
                                    <h3 className="font-semibold text-gray-900 group-hover:text-indigo-600 transition-colors mb-1">
                                        {event.title}
                                    </h3>

                                    <div className="space-y-1">
                                        <div className="flex items-center gap-2 text-sm text-gray-600">
                                            <Calendar size={14} />
                                            <span>{event.date}</span>
                                        </div>

                                        <div className="flex items-center gap-2 text-sm text-gray-600">
                                            <MapPin size={14} />
                                            <span className="truncate">{event.location}</span>
                                        </div>
                                    </div>

                                    {/* Category badge */}
                                    <div className="mt-2">
                                        <span className="inline-block px-2 py-1 text-xs font-medium bg-indigo-100 text-indigo-700 rounded">
                                            {event.category}
                                        </span>
                                    </div>
                                </div>

                                {/* Arrow indicator */}
                                <div className="flex-shrink-0 flex items-center">
                                    <ExternalLink size={18} className="text-gray-400 group-hover:text-indigo-600 transition-colors" />
                                </div>
                            </div>
                        </button>
                    ))}
                </div>

                {/* Empty state */}
                {events.length === 0 && (
                    <div className="text-center py-12">
                        <Calendar size={48} className="mx-auto text-gray-300 mb-3" />
                        <p className="text-gray-500">No events found for your travel dates</p>
                    </div>
                )}
            </div>

            {/* Event Modal */}
            <EventModal
                event={selectedEvent}
                isOpen={isModalOpen}
                onClose={closeModal}
            />
        </>
    );
}