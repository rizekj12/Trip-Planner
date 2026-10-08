import React from "react";
import { Navigate, Route, Routes } from "react-router-dom";
import DashboardPage from "./pages/DashboardPage";
import ProfilePage from "./pages/ProfilePage";
import NewTripPage from "./pages/NewTripPage";
import TripPage from "./pages/TripPage";

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<DashboardPage />} />
      <Route path="/new" element={<NewTripPage />} />
      <Route path="/drafts/:draftId" element={<NewTripPage />} />
      <Route path="/trip/:tripId" element={<TripPage />} />
      <Route path="/profile" element={<ProfilePage />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
