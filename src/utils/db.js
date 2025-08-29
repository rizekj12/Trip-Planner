import { supabase } from "./supabase";

/** Create */
export async function addToDay(dayKey, spot) {
  const user = (await supabase.auth.getUser()).data.user;
  return supabase.from("day_selections").insert({
    day_key: dayKey,
    title: spot.title,
    coords: spot.coords,
    region: spot.region || null,
    img: spot.img || null,
    links: spot.links || {},
    created_by: user?.id || null,
  });
}

/** Read (one day) */
export async function fetchDay(dayKey) {
  const { data, error } = await supabase
    .from("day_selections")
    .select("*")
    .eq("day_key", dayKey)
    .order("position", { ascending: true })
    .order("id", { ascending: true });
  if (error) throw error;
  return data;
}

/** Update (partial patch) */
export async function updatePick(id, patch) {
  return supabase.from("day_selections").update(patch).eq("id", id);
}

/** Delete */
export async function removePick(id) {
  return supabase.from("day_selections").delete().eq("id", id);
}

export async function updateCatalogSpot(id, patch) {
  return supabase.from("catalog_spots").update(patch).eq("id", id);
}

export async function deleteCatalogSpot(id) {
  // RLS already restricts delete to creator (created_by = auth.uid())
  return supabase.from("catalog_spots").delete().eq("id", id);
}
