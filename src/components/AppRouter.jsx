import React, { useState } from 'react';
import Dashboard from '../pages/Dashboard';
import App from '../App';

export default function AppRouter() {
    const [currentView, setCurrentView] = useState('dashboard'); // 'dashboard' | 'trip'
    const [selectedTrip, setSelectedTrip] = useState(null);

    const handleCreateTrip = () => {
        setSelectedTrip(null);
        setCurrentView('trip');
    };

    const handleViewTrip = (trip) => {
        setSelectedTrip(trip);
        setCurrentView('trip');
    };

    const handleBackToDashboard = () => {
        setCurrentView('dashboard');
        setSelectedTrip(null);
    };

    if (currentView === 'dashboard') {
        return (
            <Dashboard
                onCreateTrip={handleCreateTrip}
                onViewTrip={handleViewTrip}
            />
        );
    }

    return (
        <App
            existingTrip={selectedTrip}
            onBackToDashboard={handleBackToDashboard}
        />
    );
}