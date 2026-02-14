import { motion } from "framer-motion";
import React from 'react';

export default function HeaderBanner({ tripName = "Your Trip", subtitle = "AI-powered travel plan" }) {
  return (
    <div className="px-6 py-12 md:px-12">
      <motion.h1
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        className="text-4xl font-extrabold tracking-tight drop-shadow md:text-6xl"
      >
        {tripName}
      </motion.h1>
      <motion.p
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.75, delay: 0.15 }}
        className="mt-2 max-w-3xl text-base text-white drop-shadow md:text-lg"
      >
        {subtitle}
      </motion.p>
    </div>
  );
}