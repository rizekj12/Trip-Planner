import React, { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Plus, Trash2, MapPin, Calendar, LogOut } from "lucide-react";
import { supabase } from "../utils/supabase";
import { fetchTrips, deleteTrip } from "../utils/trips";
import SkyBackground from "./SkyBackground";
import { getCountryFlagOnly } from "../utils/countryFlags";

const CARD_GRADIENTS = [
  "from-indigo-500 to-purple-600",
  "from-pink-500 to-rose-600",
  "from-emerald-500 to-teal-600",
  "from-orange-500 to-amber-600",
  "from-cyan-500 to-blue-600",
  "from-violet-500 to-fuchsia-600",
  "from-lime-500 to-green-600",
  "from-red-500 to-pink-600",
];

function formatDateRange(itineraryData) {
  const formData = itineraryData?._form_data;
  if (!formData?.cities?.length) return null;
  const first = formData.cities[0];
  const last = formData.cities[formData.cities.length - 1];
  if (!first?.checkIn || !last?.checkOut) return null;
  const fmt = (d) =>
    new Date(d + "T00:00:00").toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
    });
  return `${fmt(first.checkIn)} – ${fmt(last.checkOut)}`;
}


export default function TripsDashboard({ onNewTrip, onOpenTrip }) {
  const [trips, setTrips] = useState([]);
  const [loading, setLoading] = useState(true);
  const [deletingId, setDeletingId] = useState(null);

  useEffect(() => {
    fetchTrips()
      .then(setTrips)
      .finally(() => setLoading(false));
  }, []);

  const handleDelete = async (e, id) => {
    e.stopPropagation();
    setDeletingId(id);
    try {
      await deleteTrip(id);
      setTrips((prev) => prev.filter((t) => t.id !== id));
    } finally {
      setDeletingId(null);
    }
  };

  const handleSignOut = () => supabase.auth.signOut();

  return (
    <div className="min-h-screen text-white relative">
      <SkyBackground />

      {/* Header */}
      <div className="relative px-6 pt-10 pb-4 md:px-12 flex items-end justify-between">
        <div>
          <motion.h1
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="text-4xl font-extrabold tracking-tight drop-shadow md:text-5xl"
          >
            My Trips ✈️
          </motion.h1>
          <motion.p
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.1 }}
            className="mt-1 text-white/70 text-sm"
          >
            {trips.length === 0 && !loading
              ? "No trips yet — create your first one!"
              : `${trips.length} trip${trips.length !== 1 ? "s" : ""} planned`}
          </motion.p>
        </div>
        <motion.button
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.2 }}
          onClick={handleSignOut}
          className="flex items-center gap-2 rounded-xl px-3 py-2 bg-white/15 text-white backdrop-blur ring-1 ring-white/20 hover:bg-white/25 transition text-sm"
        >
          <LogOut size={15} />
          Sign out
        </motion.button>
      </div>

      {/* Grid */}
      <div className="relative px-6 py-6 md:px-12">
        {loading ? (
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {[1, 2, 3].map((i) => (
              <div
                key={i}
                className="h-44 rounded-2xl bg-white/10 animate-pulse"
              />
            ))}
          </div>
        ) : (
          <motion.div
            className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3"
            initial="hidden"
            animate="visible"
            variants={{ visible: { transition: { staggerChildren: 0.07 } } }}
          >
            {/* New Trip card */}
            <motion.button
              variants={{ hidden: { opacity: 0, y: 20 }, visible: { opacity: 1, y: 0 } }}
              onClick={onNewTrip}
              className="h-44 rounded-2xl border-2 border-dashed border-white/30 bg-white/10 backdrop-blur flex flex-col items-center justify-center gap-2 hover:bg-white/20 hover:border-white/50 transition group"
            >
              <div className="w-12 h-12 rounded-full bg-white/20 flex items-center justify-center group-hover:bg-white/30 transition">
                <Plus size={24} className="text-white" />
              </div>
              <span className="text-white font-semibold">New Trip</span>
            </motion.button>

            {/* Trip cards */}
            <AnimatePresence>
              {trips.map((trip, idx) => {
                const gradient = CARD_GRADIENTS[idx % CARD_GRADIENTS.length];
                const dateRange = formatDateRange(trip.itinerary_data);
                const days = trip.duration;
                const flag = getCountryFlagOnly(trip.destination);
                const cities = trip.cities || [];

                return (
                  <motion.div
                    key={trip.id}
                    variants={{ hidden: { opacity: 0, y: 20 }, visible: { opacity: 1, y: 0 } }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    onClick={() => onOpenTrip(trip.id)}
                    className={`relative h-44 rounded-2xl bg-gradient-to-br ${gradient} cursor-pointer shadow-lg hover:shadow-2xl hover:scale-[1.02] transition-all duration-200 p-5 flex flex-col justify-between overflow-hidden`}
                  >
                    {/* Background pattern */}
                    <div className="absolute inset-0 opacity-10"
                      style={{
                        backgroundImage: "radial-gradient(circle at 80% 20%, white 1px, transparent 1px), radial-gradient(circle at 20% 80%, white 1px, transparent 1px)",
                        backgroundSize: "30px 30px"
                      }}
                    />

                    {/* Delete button */}
                    <button
                      onClick={(e) => handleDelete(e, trip.id)}
                      disabled={deletingId === trip.id}
                      className="absolute top-3 right-3 w-8 h-8 rounded-full bg-black/20 flex items-center justify-center hover:bg-black/40 transition opacity-0 group-hover:opacity-100 z-10"
                      style={{ opacity: deletingId === trip.id ? 1 : undefined }}
                    >
                      <Trash2 size={14} className="text-white" />
                    </button>

                    <div className="relative">
                      <div className="text-3xl mb-1">{flag}</div>
                      <h3 className="text-white font-bold text-lg leading-tight drop-shadow">
                        {cities.length ? cities.join(", ") : trip.destination}
                      </h3>
                      <p className="text-white/80 text-sm">{trip.destination}</p>
                    </div>

                    <div className="relative flex items-center gap-4 text-white/80 text-xs">
                      {dateRange && (
                        <span className="flex items-center gap-1">
                          <Calendar size={12} />
                          {dateRange}
                        </span>
                      )}
                      {days > 0 && (
                        <span className="flex items-center gap-1">
                          <MapPin size={12} />
                          {days} day{days !== 1 ? "s" : ""}
                        </span>
                      )}
                    </div>
                  </motion.div>
                );
              })}
            </AnimatePresence>
          </motion.div>
        )}
      </div>
    </div>
  );
}
