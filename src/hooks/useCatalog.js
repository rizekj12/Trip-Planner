import { useEffect, useState } from "react";
import { supabase } from "../utils/supabase";

/** Live list of catalog spots for a given category ('extras' or 'food') */
export function useCatalog(category) {
  const [rows, setRows] = useState([]);

  useEffect(() => {
    let active = true;
    if (!category) {
      setRows([]);
      return;
    }

    const load = async () => {
      const { data } = await supabase
        .from("catalog_spots")
        .select("*")
        .eq("category", category)
        .order("id", { ascending: true });
      if (active) setRows(data || []);
    };
    load();

    const channel = supabase
      .channel(`catalog_${category}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "catalog_spots",
          filter: `category=eq.${category}`,
        },
        load
      )
      .subscribe();

    return () => {
      active = false;
      supabase.removeChannel(channel);
    };
  }, [category]);

  // normalize to your spot shape
  return rows.map((r) => ({
    id: r.id,
    title: r.title,
    address: r.address,
    coords: r.coords || undefined,
    region: r.region || undefined,
    img: r.img || undefined,
    links: r.links || {},
    created_by: r.created_by || null,
  }));
}
