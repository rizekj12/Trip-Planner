import { useEffect, useState } from "react";
import { supabase } from "../utils/supabase";

/** Returns array of spot-like objects for a given dayKey, kept in sync via realtime */
export function useDaySelections(dayKey) {
  const [rows, setRows] = useState([]);

  useEffect(() => {
    let active = true;
    // If not on a day tab, clear and bail.
    if (!dayKey) {
      setRows([]);
      return () => {};
    }

    const load = async () => {
      const { data } = await supabase
        .from("day_selections")
        .select("*")
        .eq("day_key", dayKey)
        .order("position", { ascending: true })
        .order("id", { ascending: true });
      if (active) setRows(data || []);
    };
    load();

    const channel = supabase
      .channel(`day_${dayKey}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "day_selections",
          filter: `day_key=eq.${dayKey}`,
        },
        load
      )
      .subscribe();

    return () => {
      active = false;
      supabase.removeChannel(channel);
    };
  }, [dayKey]);

  // Normalize to your app's "spot" shape
  return rows.map((r) => ({
    id: r.id,
    title: r.title,
    coords: r.coords,
    region: r.region || undefined,
    img: r.img || undefined,
    links: r.links || {},
  }));
}
