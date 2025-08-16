import { supabase } from "./supabase";

export async function updateCatalogSpot(id, patch) {
  // patch example: { coords: [35.68, 139.76] }
  return supabase.from("catalog_spots").update(patch).eq("id", id);
}

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
