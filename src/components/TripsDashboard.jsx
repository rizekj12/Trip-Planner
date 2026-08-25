import React, { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Plus, Trash2, MapPin, Calendar, MoreVertical, Eye, PlayCircle } from "lucide-react";
import { fetchTrips, deleteTrip } from "../utils/trips";
import SkyBackground from "./SkyBackground";
import { getCountryFlagOnly } from "../utils/countryFlags";
import ProfileMenu from "./ProfileMenu";

function TripCardMenu({ isDraft, onView, onContinue, onDelete, deleting }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    const handler = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  return (
    <div ref={ref} className="absolute top-3 right-3 z-10" onClick={(e) => e.stopPropagation()}>
      <button
        onClick={() => setOpen((o) => !o)}
        disabled={deleting}
        aria-label="Trip options"
        className="w-8 h-8 rounded-full bg-black/20 flex items-center justify-center hover:bg-black/40 transition"
      >
        <MoreVertical size={16} className="text-white" />
      </button>

      {open && (
        <div
          className="absolute mt-1 w-40 bg-white rounded-xl shadow-xl border border-gray-100 py-1 z-50 text-sm"
          style={{ right: 0 }}
        >
          {isDraft ? (
            <button
              onClick={() => { setOpen(false); onContinue(); }}
              className="w-full flex items-center gap-2 px-4 py-2 text-gray-700 hover:bg-indigo-50 hover:text-indigo-700 transition"
            >
              <PlayCircle size={15} />
              Continue
            </button>
          ) : (
            <button
              onClick={() => { setOpen(false); onView(); }}
              className="w-full flex items-center gap-2 px-4 py-2 text-gray-700 hover:bg-indigo-50 hover:text-indigo-700 transition"
            >
              <Eye size={15} />
              View Itinerary
            </button>
          )}
          <button
            onClick={() => { setOpen(false); onDelete(); }}
            className="w-full flex items-center gap-2 px-4 py-2 text-gray-700 hover:bg-red-50 hover:text-red-600 transition"
          >
            <Trash2 size={15} />
            Delete
          </button>
        </div>
      )}
    </div>
  );
}

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


export default function TripsDashboard({ onNewTrip, onOpenTrip, onContinueDraft, onOpenProfile }) {
  const [trips, setTrips] = useState([]);
  const [loading, setLoading] = useState(true);
  const [deletingId, setDeletingId] = useState(null);

  useEffect(() => {
    fetchTrips()
      .then(setTrips)
      .finally(() => setLoading(false));
  }, []);

  const handleDelete = async (id) => {
    setDeletingId(id);
    try {
      await deleteTrip(id);
      setTrips((prev) => prev.filter((t) => t.id !== id));
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <div className="min-h-screen text-white relative">
      <SkyBackground />

      {/* Header */}
      <div className="relative pl-6 pr-8 pt-10 pb-4 md:pl-12 md:pr-12 flex items-center justify-between">
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
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.2 }} className="flex-shrink-0">
          <ProfileMenu onOpenProfile={onOpenProfile} />
        </motion.div>
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
                const isDraft = trip.itinerary_data?._draft === true;
                const gradient = CARD_GRADIENTS[idx % CARD_GRADIENTS.length];
                const dateRange = formatDateRange(trip.itinerary_data);
                const days = trip.duration;
                const flag = getCountryFlagOnly(trip.destination);
                const cities = trip.cities || [];

                if (isDraft) {
                  return (
                    <motion.div
                      key={trip.id}
                      variants={{ hidden: { opacity: 0, y: 20 }, visible: { opacity: 1, y: 0 } }}
                      exit={{ opacity: 0, scale: 0.95 }}
                      className="relative h-44 rounded-2xl bg-white/10 border-2 border-dashed border-white/25 shadow-lg hover:bg-white/15 transition-all duration-200 p-5 flex flex-col justify-between overflow-hidden opacity-80"
                    >
                      <TripCardMenu
                        isDraft
                        onContinue={() => onContinueDraft(trip.id)}
                        onDelete={() => handleDelete(trip.id)}
                        deleting={deletingId === trip.id}
                      />

                      <div className="relative">
                        <span className="inline-block px-2 py-0.5 rounded-full bg-white/20 text-white/90 text-[10px] font-bold uppercase tracking-wide mb-2">
                          Draft
                        </span>
                        <h3 className="text-white font-bold text-lg leading-tight drop-shadow">
                          {trip.destination || "Untitled Trip"}
                        </h3>
                        {cities.length > 0 && (
                          <p className="text-white/60 text-sm">{cities.join(", ")}</p>
                        )}
                      </div>

                      <div className="relative text-white/50 text-xs">
                        Click ⋮ to continue planning
                      </div>
                    </motion.div>
                  );
                }

                return (
                  <motion.div
                    key={trip.id}
                    variants={{ hidden: { opacity: 0, y: 20 }, visible: { opacity: 1, y: 0 } }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    className={`relative h-44 rounded-2xl bg-gradient-to-br ${gradient} shadow-lg hover:shadow-2xl transition-all duration-200 p-5 flex flex-col justify-between overflow-hidden`}
                  >
                    {/* Background pattern */}
                    <div className="absolute inset-0 opacity-10"
                      style={{
                        backgroundImage: "radial-gradient(circle at 80% 20%, white 1px, transparent 1px), radial-gradient(circle at 20% 80%, white 1px, transparent 1px)",
                        backgroundSize: "30px 30px"
                      }}
                    />

                    <TripCardMenu
                      onView={() => onOpenTrip(trip.id)}
                      onDelete={() => handleDelete(trip.id)}
                      deleting={deletingId === trip.id}
                    />

                    <div className="relative">
                      <div className="text-3xl mb-1">{flag}</div>
                      <h3 className="text-white font-bold text-lg leading-tight drop-shadow">
                        {trip.destination}
                      </h3>
                      {cities.length > 0 && (
                        <p className="text-white/80 text-sm">{cities.join(", ")}</p>
                      )}
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
