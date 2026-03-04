import React, { useState, useEffect } from 'react';
import { supabase } from '../utils/supabase';
import { motion } from 'framer-motion';
import { Plus, MapPin, Calendar, LogOut, Trash2, Sparkles } from 'lucide-react';
import SkyBackground from '../components/SkyBackground';

export default function Dashboard({ onCreateTrip, onViewTrip }) {
  const [user, setUser] = useState(null);
  const [trips, setTrips] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getUser();
    loadTrips();
  }, []);

  async function getUser() {
    const { data: { user } } = await supabase.auth.getUser();
    setUser(user);
  }

  async function loadTrips() {
    try {
      const { data, error } = await supabase
        .from('trips')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error loading trips:', error);
        // Don't throw - table might not exist yet
      }
      setTrips(data || []);
    } catch (err) {
      console.error('Error loading trips:', err);
    } finally {
      setLoading(false);
    }
  }

  async function deleteTrip(tripId) {
    if (!confirm('Are you sure you want to delete this trip?')) return;

    try {
      const { error } = await supabase
        .from('trips')
        .delete()
        .eq('id', tripId);

      if (error) throw error;
      
      setTrips(trips.filter(t => t.id !== tripId));
    } catch (err) {
      console.error('Error deleting trip:', err);
      alert('Failed to delete trip');
    }
  }

  async function handleLogout() {
    await supabase.auth.signOut();
  }

  const username = user?.user_metadata?.username || user?.email?.split('@')[0] || 'Traveler';

  return (
    <div className="min-h-screen relative">
      <SkyBackground />

      <div className="relative">
        {/* Header */}
        <div className="px-6 py-8 md:px-12">
          <div className="max-w-7xl mx-auto flex justify-between items-start">
            <div>
              <motion.h1
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="text-4xl md:text-5xl font-bold text-white drop-shadow-lg"
              >
                Welcome back, {username}! 👋
              </motion.h1>
              <motion.p
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 }}
                className="text-white/90 mt-2 drop-shadow"
              >
                Ready for your next adventure?
              </motion.p>
            </div>

            <button
              onClick={handleLogout}
              className="flex items-center gap-2 px-4 py-2 bg-white/20 backdrop-blur-sm text-white rounded-xl hover:bg-white/30 transition-all"
            >
              <LogOut size={18} />
              Logout
            </button>
          </div>
        </div>

        {/* Main Content */}
        <div className="max-w-7xl mx-auto px-6 md:px-12 pb-16">
          {/* Create New Trip Card */}
          <motion.button
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.2 }}
            onClick={onCreateTrip}
            className="w-full mb-8 p-8 bg-gradient-to-r from-indigo-600 to-purple-600 rounded-2xl shadow-2xl hover:shadow-3xl transition-all group"
          >
            <div className="flex items-center justify-center gap-4">
              <div className="p-4 bg-white/20 rounded-full group-hover:scale-110 transition-transform">
                <Plus size={32} className="text-white" />
              </div>
              <div className="text-left">
                <h2 className="text-2xl font-bold text-white">Create New Trip</h2>
                <p className="text-purple-100">Let AI plan your perfect itinerary</p>
              </div>
            </div>
          </motion.button>

          {/* Your Trips */}
          <div className="mb-4">
            <h2 className="text-2xl font-bold text-white drop-shadow mb-4">
              Your Trips {trips.length > 0 && `(${trips.length})`}
            </h2>
          </div>

          {loading ? (
            <div className="text-center py-12">
              <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-white"></div>
              <p className="text-white mt-4">Loading your trips...</p>
            </div>
          ) : trips.length === 0 ? (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.3 }}
              className="text-center py-12 bg-white/10 backdrop-blur-sm rounded-2xl"
            >
              <Sparkles size={64} className="mx-auto text-white/50 mb-4" />
              <p className="text-white text-lg">No trips yet!</p>
              <p className="text-white/70 mt-2">Create your first trip to get started</p>
            </motion.div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {trips.map((trip, index) => (
                <motion.div
                  key={trip.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.1 * index }}
                  className="bg-white/95 backdrop-blur-sm rounded-2xl shadow-xl overflow-hidden hover:shadow-2xl transition-all group cursor-pointer"
                  onClick={() => onViewTrip(trip)}
                >
                  <div className="p-6">
                    <div className="flex justify-between items-start mb-4">
                      <div className="flex-1">
                        <h3 className="text-xl font-bold text-gray-900 group-hover:text-indigo-600 transition-colors">
                          {trip.destination || 'Unnamed Trip'}
                        </h3>
                        <p className="text-sm text-gray-600 mt-1">
                          {trip.duration || 'N/A'} days
                        </p>
                      </div>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          deleteTrip(trip.id);
                        }}
                        className="p-2 hover:bg-red-50 rounded-lg transition-colors group/delete"
                      >
                        <Trash2 size={18} className="text-gray-400 group-hover/delete:text-red-600" />
                      </button>
                    </div>

                    <div className="space-y-2">
                      <div className="flex items-center gap-2 text-sm text-gray-600">
                        <Calendar size={16} />
                        <span>{new Date(trip.created_at).toLocaleDateString()}</span>
                      </div>
                      {trip.cities && (
                        <div className="flex items-center gap-2 text-sm text-gray-600">
                          <MapPin size={16} />
                          <span className="truncate">{trip.cities.join(', ')}</span>
                        </div>
                      )}
                    </div>

                    {(trip.travel_style || trip.vacation_type) && (
                      <div className="mt-4 pt-4 border-t border-gray-200">
                        <div className="flex gap-2 text-xs flex-wrap">
                          {trip.travel_style && (
                            <span className="px-2 py-1 bg-indigo-50 text-indigo-700 rounded-full">
                              {trip.travel_style.replace('_', ' ')}
                            </span>
                          )}
                          {trip.vacation_type && (
                            <span className="px-2 py-1 bg-purple-50 text-purple-700 rounded-full">
                              {trip.vacation_type}
                            </span>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                </motion.div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
