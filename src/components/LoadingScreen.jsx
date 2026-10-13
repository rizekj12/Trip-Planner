import React from "react";

export default function LoadingScreen({ message = "Loading..." }) {
  return (
    <div className="min-h-screen flex items-center justify-center px-6 bg-gradient-to-br from-indigo-900 via-purple-900 to-pink-800">
      <p className="max-w-lg text-center text-white text-xl">{message}</p>
    </div>
  );
}
