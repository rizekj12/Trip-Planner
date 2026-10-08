import React, { useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import TripQuestionnaire from "../components/trip-generator/TripQuestionnaire";
import LoadingScreen from "../components/LoadingScreen";
import { useTrip, useStartGeneration, useSaveDraft } from "../hooks/useTrips";

// Handles both /new and /drafts/:draftId (continuing a saved questionnaire)
export default function NewTripPage() {
  const { draftId } = useParams();
  const navigate = useNavigate();
  const draft = useTrip(draftId);
  const startGeneration = useStartGeneration();
  const saveDraft = useSaveDraft();
  const [error, setError] = useState(null);

  if (draftId && draft.isLoading) return <LoadingScreen />;

  // Saves the trip as pending (reusing the draft row if we started from one) and
  // jumps to its page, which shows the loading screen until the itinerary is ready
  const handleComplete = async (formData) => {
    setError(null);
    try {
      const row = await startGeneration.mutateAsync({ id: draftId, formData });
      navigate(`/trip/${row.id}`, { replace: true });
    } catch (err) {
      console.error('Failed to save trip:', err);
      setError(err.message || 'Failed to save your trip. Please try again.');
    }
  };

  const handleSaveDraftAndExit = async (formData) => {
    const hasProgress = formData.country
      || (formData.cities || []).some(c => c.name || c.checkIn || c.checkOut);

    if (hasProgress) {
      try {
        await saveDraft.mutateAsync({ id: draftId, formData });
      } catch (err) {
        console.error("Failed to save draft:", err);
      }
    }
    navigate("/");
  };

  return (
    <div>
      <TripQuestionnaire
        key={draftId ?? "new"}
        onComplete={handleComplete}
        isGenerating={startGeneration.isPending}
        initialFormData={draft.data?.itinerary_data?._form_data || null}
        onHome={handleSaveDraftAndExit}
      />

      {error && (
        <div className="fixed bottom-8 left-1/2 transform -translate-x-1/2 bg-red-500 text-white px-6 py-4 rounded-xl shadow-2xl max-w-md z-50">
          <p className="font-semibold">Oops! Something went wrong</p>
          <p className="text-sm mt-1">{error}</p>
          <button
            onClick={() => setError(null)}
            className="mt-3 text-xs underline hover:no-underline"
          >
            Dismiss
          </button>
        </div>
      )}
    </div>
  );
}
