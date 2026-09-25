import { createClient } from "@/lib/supabase/server";
import { ONTARIO_CENTRES, type Centre } from "@/lib/centres";

/**
 * GET /api/centres
 * Returns wildlife centres from the database, falling back to the built-in
 * seed list if the database isn't configured or reachable.
 */
export async function GET() {
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL) {
    return Response.json({ centres: ONTARIO_CENTRES, source: "static" });
  }

  try {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("centres")
      .select(
        "id, name, town, lat, lng, takes, phone, website, notes, type, directory_only"
      );

    if (error || !data || data.length === 0) {
      return Response.json({ centres: ONTARIO_CENTRES, source: "static" });
    }

    return Response.json({ centres: data as Centre[], source: "db" });
  } catch {
    return Response.json({ centres: ONTARIO_CENTRES, source: "static" });
  }
}
