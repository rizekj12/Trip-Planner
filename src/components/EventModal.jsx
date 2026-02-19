import React from 'react';
import { X, Calendar, Clock, MapPin, Tag, ExternalLink, Ticket } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export default function EventModal({ event, isOpen, onClose }) {
    if (!event) return null;

    function getDefaultEventImage(category) {
        // Use local images instead of URLs
        const defaults = {
            'Food & Drink': '/default-event.jpg',
            'Music & Dance': '/default-event.jpg',
            'Sports & Recreation': '/default-event.jpg',
            'Arts & Culture': '/default-event.jpg',
            'Nightlife': '/default-event.jpg',
            'Festival': '/default-event.jpg',
            'Market': '/default-event.jpg',
        };

        return defaults[category] || '/default-event.jpg';
    }
    return (
        <AnimatePresence>
            {isOpen && (
                <>
                    {/* Backdrop */}
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={onClose}
                        className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50"
                    />

                    {/* Modal */}
                    <motion.div
                        initial={{ opacity: 0, scale: 0.95, y: 20 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.95, y: 20 }}
                        transition={{ type: "spring", duration: 0.5 }}
                        className="fixed inset-0 m-auto w-full max-w-2xl h-fit max-h-[90vh] overflow-y-auto bg-white rounded-2xl shadow-2xl z-50"
                    >
                        {/* Close button */}
                        <button
                            onClick={onClose}
                            className="absolute top-4 right-4 p-2 rounded-full bg-gray-100 hover:bg-gray-200 transition-colors z-10"
                            aria-label="Close"
                        >
                            <X size={20} className="text-gray-600" />
                        </button>

                        {/* Event Image */}
                        <div className="relative h-64 overflow-hidden rounded-t-2xl">
                            {event.image ? (
                                <>
                                    <img
                                        src={event.image}
                                        alt={event.title}
                                        className="w-full h-full object-cover"
                                    />
                                    <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent" />
                                </>
                            ) : (
                                // Beautiful gradient placeholder
                                <div className="w-full h-full bg-gradient-to-br from-purple-600 via-pink-500 to-orange-400 flex items-center justify-center">
                                    <div className="text-white text-center p-6">
                                        <div className="text-6xl mb-3">🎉</div>
                                        <p className="text-lg font-semibold opacity-90">Local Event</p>
                                    </div>
                                </div>
                            )}

                            {/* Category badge */}
                            <div className="absolute top-4 left-4">
                                <span className="inline-flex items-center gap-1 px-3 py-1 bg-white/90 backdrop-blur-sm rounded-full text-sm font-medium text-gray-800">
                                    <Tag size={14} />
                                    {event.category}
                                </span>
                            </div>
                        </div>

                        {/* Content */}
                        <div className="p-6 space-y-6">
                            {/* Title */}
                            <div>
                                <h2 className="text-3xl font-bold text-gray-900">{event.title}</h2>
                            </div>

                            {/* Details Grid */}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                {/* Date */}
                                <div className="flex items-start gap-3">
                                    <div className="p-2 bg-indigo-50 rounded-lg">
                                        <Calendar size={20} className="text-indigo-600" />
                                    </div>
                                    <div>
                                        <p className="text-xs font-medium text-gray-500 uppercase">Date</p>
                                        <p className="text-sm font-semibold text-gray-900">{event.date}</p>
                                    </div>
                                </div>

                                {/* Time */}
                                <div className="flex items-start gap-3">
                                    <div className="p-2 bg-purple-50 rounded-lg">
                                        <Clock size={20} className="text-purple-600" />
                                    </div>
                                    <div>
                                        <p className="text-xs font-medium text-gray-500 uppercase">Time</p>
                                        <p className="text-sm font-semibold text-gray-900">{event.time}</p>
                                    </div>
                                </div>

                                {/* Location */}
                                <div className="flex items-start gap-3 md:col-span-2">
                                    <div className="p-2 bg-green-50 rounded-lg">
                                        <MapPin size={20} className="text-green-600" />
                                    </div>
                                    <div>
                                        <p className="text-xs font-medium text-gray-500 uppercase">Location</p>
                                        <p className="text-sm font-semibold text-gray-900">{event.location}</p>
                                        <p className="text-xs text-gray-600 mt-1">{event.address}</p>
                                    </div>
                                </div>

                                {/* Price */}
                                {event.price && (
                                    <div className="flex items-start gap-3 md:col-span-2">
                                        <div className="p-2 bg-amber-50 rounded-lg">
                                            <Ticket size={20} className="text-amber-600" />
                                        </div>
                                        <div>
                                            <p className="text-xs font-medium text-gray-500 uppercase">Price</p>
                                            <p className="text-sm font-semibold text-gray-900">{event.price}</p>
                                        </div>
                                    </div>
                                )}
                            </div>

                            {/* Description */}
                            <div>
                                <h3 className="text-sm font-semibold text-gray-900 mb-2">About This Event</h3>
                                <p className="text-gray-700 leading-relaxed">{event.description}</p>
                            </div>

                            {/* Action Buttons */}
                            <div className="flex flex-col sm:flex-row gap-3 pt-4 border-t">
                                {event.ticketLink && (
                                    <a
                                        href={event.ticketLink}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="flex items-center justify-center gap-2 px-6 py-3 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-xl hover:shadow-lg transition-all font-semibold"
                                    >
                                        <Ticket size={18} />
                                        Get Tickets
                                    </a>
                                )}

                                {event.website && (
                                    <a
                                        href={event.website}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="flex items-center justify-center gap-2 px-6 py-3 bg-gray-100 text-gray-900 rounded-xl hover:bg-gray-200 transition-colors font-medium"
                                    >
                                        <ExternalLink size={18} />
                                        Visit Website
                                    </a>
                                )}
                                {/* Show message if no links available */}
                                {!event.ticketLink && !event.website && (
                                    <div className="text-center py-3 text-gray-500 text-sm">
                                        No official website available • Check local listings
                                    </div>
                                )}

                            </div>
                        </div>
                    </motion.div>
                </>
            )}
        </AnimatePresence>
    );
}
