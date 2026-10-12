import React from "react";
import { Navigate, Route, Routes } from "react-router-dom";
import AuthGate from "./components/AuthGate";
import DashboardPage from "./pages/DashboardPage";
import ProfilePage from "./pages/ProfilePage";
import NewTripPage from "./pages/NewTripPage";
import TripPage from "./pages/TripPage";
import CalendarPage from "./pages/CalendarPage";
import JoinPage from "./pages/JoinPage";
import GuestTripPage from "./pages/GuestTripPage";

export default function App() {
  return (
    <Routes>
      {/* Open without signing in: invite links and a guest's view-only trip */}
      <Route path="/join/:token" element={<JoinPage />} />
      <Route path="/guest/:token" element={<GuestTripPage />} />

      {/* Everything else needs an account */}
      <Route
        path="*"
        element={
          <AuthGate>
            <Routes>
              <Route path="/" element={<DashboardPage />} />
              <Route path="/new" element={<NewTripPage />} />
              <Route path="/drafts/:draftId" element={<NewTripPage />} />
              <Route path="/trip/:tripId" element={<TripPage />} />
              <Route path="/calendar" element={<CalendarPage />} />
              <Route path="/profile" element={<ProfilePage />} />
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </AuthGate>
        }
      />
    </Routes>
  );
}
