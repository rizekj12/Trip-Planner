import React, { useState } from 'react';
import { UtensilsCrossed, MapPin, DollarSign, Star, Clock, Phone, ExternalLink } from 'lucide-react';
import { motion } from 'framer-motion';

export default function FoodSpotsPanel({ foodSpots, theme }) {
    const getPriceColor = (price) => {
        const colors = {
            '$': 'text-green-600 bg-green-50',
            '$$': 'text-blue-600 bg-blue-50',
            '$$$': 'text-purple-600 bg-purple-50',
            '$$$$': 'text-pink-600 bg-pink-50'
        };
        return colors[price] || 'text-gray-600 bg-gray-50';
    };

    return (
        <div className={`rounded-2xl p-6 shadow-xl ${theme.card}`}>
            {/* Header */}
            <div className={`mb-6 rounded-xl p-4 ${theme.header}`}>
                <h2 className="text-2xl font-semibold">Top Food Spots</h2>
                <p className="text-sm opacity-80 mt-1">Local favorites & must-try restaurants</p>
            </div>

            {/* Food Spots Grid */}
            {foodSpots && foodSpots.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {foodSpots.map((spot, index) => (
                        <motion.div
                            key={spot.id}
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: index * 0.1 }}
                            className={`rounded-xl p-5 transition-all hover:shadow-lg group ${theme.sub} border-2 border-transparent hover:border-indigo-200`}
                        >
                            {/* Header */}
                            <div className="flex justify-between items-start mb-3">
                                <div className="flex-1">
                                    <h3 className="font-bold text-lg text-gray-900 group-hover:text-indigo-600 transition-colors">
                                        {spot.title}
                                    </h3>
                                    <p className="text-sm text-gray-600">{spot.cuisine}</p>
                                </div>
                                <div className="flex items-center gap-2">
                                    <span className={`px-2 py-1 rounded text-sm font-semibold ${getPriceColor(spot.priceRange)}`}>
                                        {spot.priceRange}
                                    </span>
                                    {spot.rating && (
                                        <span className="flex items-center gap-1 text-sm font-semibold text-amber-600">
                                            <Star size={14} className="fill-amber-400" />
                                            {spot.rating}
                                        </span>
                                    )}
                                </div>
                            </div>

                            {/* Description */}
                            <p className="text-sm text-gray-700 mb-4 line-clamp-2">
                                {spot.description}
                            </p>

                            {/* Must Try */}
                            {spot.mustTry && spot.mustTry.length > 0 && (
                                <div className="mb-4">
                                    <p className="text-xs font-semibold text-gray-600 uppercase mb-2">Must Try:</p>
                                    <div className="flex flex-wrap gap-2">
                                        {spot.mustTry.slice(0, 3).map((dish, i) => (
                                            <span key={i} className="text-xs px-2 py-1 bg-indigo-50 text-indigo-700 rounded-full">
                                                {dish}
                                            </span>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {/* Info */}
                            <div className="space-y-2 mb-4">
                                {spot.hours && (
                                    <div className="flex items-center gap-2 text-sm text-gray-600">
                                        <Clock size={14} />
                                        <span className="text-xs">{spot.hours}</span>
                                    </div>
                                )}
                                <div className="flex items-center gap-2 text-sm text-gray-600">
                                    <MapPin size={14} />
                                    <span className="text-xs truncate">{spot.address}</span>
                                </div>
                            </div>

                            {/* Actions */}
                            <div className="flex gap-2">
                                {spot.googleMaps && (<a

                                    href={spot.googleMaps}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors text-sm font-medium"
                                >
                                    <MapPin size={14} />
                                    Directions
                                </a>
                                )}
                                {spot.website && (<a

                                    href={spot.website}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="flex items-center justify-center gap-2 px-4 py-2 bg-gray-100 text-gray-900 rounded-lg hover:bg-gray-200 transition-colors text-sm font-medium"
                                >
                                    <ExternalLink size={14} />
                                </a>
                                )}
                            </div>
                            The missing parts were:
                        </motion.div>
                    ))
                    }
                </div >
            ) : (
                <div className="text-center py-12">
                    <UtensilsCrossed size={48} className="mx-auto text-gray-300 mb-3" />
                    <p className="text-gray-500">No restaurant recommendations available</p>
                </div>
            )}
        </div >
    );
}