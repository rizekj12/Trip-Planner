import React from "react";

export default function LoadingScreen({ message = "Loading..." }) {
  return (
    <div className="min-h-screen flex items-center justify-center px-6 bg-cream">
      <p className="max-w-lg text-center text-slate-800 text-xl font-semibold">{message}</p>
    </div>
  );
}
