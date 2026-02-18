import React from 'react';
import { X, Calendar, Clock, MapPin, Tag, ExternalLink, Ticket } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export default function EventModal({ event, isOpen, onClose }) {
    if (!event) return null;

    function getDefaultEventImage(category) {
        const defaults = {
            'Food & Drink': 'https://images.unsplash.com/photo-1555939594-58d7cb561ad1?w=800&q=80',
            'Music & Dance': 'https://images.unsplash.com/photo-1459749411175-04bf5292ceea?w=800&q=80',
            'Sports & Recreation': 'https://images.unsplash.com/photo-1461896836934-ffe607ba8211?w=800&q=80',
            'Arts & Culture': 'https://images.unsplash.com/photo-1460661419201-fd4cecdf8a8b?w=800&q=80',
            'Nightlife': 'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?w=800&q=80',
            'Festival': 'https://images.unsplash.com/photo-1533174072545-7a4b6ad7a6c3?w=800&q=80',
            'Market': 'https://images.unsplash.com/photo-1488459716781-31db52582fe9?w=800&q=80',
        };

        return defaults[category] || 'https://images.unsplash.com/photo-1492684223066-81342ee5ff30?w=800&q=80';
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
                        {event.image && (
                            <div className="relative h-64 overflow-hidden rounded-t-2xl">
                                <img
                                    src={event.image || getDefaultEventImage(event.category)}
                                    alt={event.title}
                                    className="w-full h-full object-cover"
                                />
                                <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent" />

                                {/* Category badge */}
                                <div className="absolute top-4 left-4">
                                    <span className="inline-flex items-center gap-1 px-3 py-1 bg-white/90 backdrop-blur-sm rounded-full text-sm font-medium text-gray-800">
                                        <Tag size={14} />
                                        {event.category}
                                    </span>
                                </div>
                            </div>
                        )}

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
