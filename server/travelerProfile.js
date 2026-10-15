// The organizer's accessibility and dietary needs from their profile (supabase/migrations),
// for the itinerary and food spot prompts. `client` is the service-role client or one acting
// as the user (who can read their own profile). Never throws: no needs if it can't be read.
export async function travelerNeeds(client, userId) {
  if (!client || !userId) return null;
  const { data, error } = await client
    .from("profiles")
    .select("accessibility_needs, accessibility_notes")
    .eq("id", userId)
    .maybeSingle();
  if (error || !data) return null;
  return { needs: data.accessibility_needs || [], notes: data.accessibility_notes || "" };
}
