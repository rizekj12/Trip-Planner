// Shared by the questionnaire's optional questions (src/components/trip-generator/PreferenceInputs.jsx)

export const inputClass =
    'w-full min-h-[44px] px-4 py-2 text-base border-2 border-gray-200 rounded-xl focus:border-indigo-500 focus:outline-none';

// Reads and writes formData.preferences; returns [preferences, setPreference(key, value)]
export function usePreferences(formData, updateFormData) {
    const preferences = formData.preferences;
    const set = (key, value) => updateFormData({ preferences: { ...formData.preferences, [key]: value } });
    return [preferences, set];
}
