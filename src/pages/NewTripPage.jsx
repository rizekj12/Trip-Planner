import React, { useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import TripQuestionnaire from "../components/trip-generator/TripQuestionnaire";
import LoadingScreen from "../components/LoadingScreen";
import { generateItinerary } from "../utils/aiService";
import { useTrip, useSaveTrip, useSaveDraft } from "../hooks/useTrips";

// Handles both /new and /drafts/:draftId (continuing a saved questionnaire)
export default function NewTripPage() {
  const { draftId } = useParams();
  const navigate = useNavigate();
  const draft = useTrip(draftId);
  const saveTrip = useSaveTrip();
  const saveDraft = useSaveDraft();
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState(null);

  if (draftId && draft.isLoading) return <LoadingScreen />;

  const handleComplete = async (formData, useMock = false) => {
    setIsGenerating(true);
    setError(null);

    try {
      const itinerary = await generateItinerary(formData, useMock);
      // Completes the draft row if we started from one
      const row = await saveTrip.mutateAsync({ id: draftId, country: formData.country, formData, itinerary });
      navigate(`/trip/${row.id}`, { replace: true });
    } catch (err) {
      console.error('Generation error:', err);
      setError(err.message || 'Failed to generate itinerary. Please try again.');
      setIsGenerating(false);
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
        isGenerating={isGenerating}
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
