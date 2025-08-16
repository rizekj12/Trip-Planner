import React from 'react';

import { AnimatePresence, motion } from "framer-motion";

export default function Modal({ open, onClose, children, theme }) {
  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-[10000] flex items-center justify-center"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          <div className="absolute inset-0 bg-black/60" onClick={onClose} />
          <motion.div
            initial={{ y: 40, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 40, opacity: 0 }}
            className={`relative z-[10001] w-[92vw] max-w-3xl rounded-2xl p-4 shadow-2xl ${theme.card}`}
          >
            <button
              className="absolute right-3 top-3 rounded-full bg-white/60 px-3 py-1 text-sm text-zinc-800 hover:bg-white/80"
              onClick={onClose}
            >
              x
            </button>
            {children}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
