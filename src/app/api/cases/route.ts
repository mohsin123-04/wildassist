import { NextRequest } from "next/server";
import { createAdminClient } from "@/lib/supabase/server";
import { SITUATIONS } from "@/lib/triage";

/**
 * POST /api/cases
 * Logs a completed triage as a case. Writes go through the server (service
 * role) so the public never touches the database directly.
 * Body: { animal, situation, description?, verdict, title? }
 * Returns: { id } or { ok: false } if the database isn't configured.
 */
export async function POST(req: NextRequest) {
  if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
    // Database not configured — logging is a no-op so the app still works.
    return Response.json({ ok: false, reason: "no-db" });
  }

  let body: {
    animal?: string;
    situation?: string;
    description?: string;
    verdict?: string;
    title?: string;
  };
  try {
    body = await req.json();
  } catch {
    return Response.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const { animal, situation, description = "", verdict, title } = body;

  const animalOk =
    typeof animal === "string" && animal.trim().length > 0 && animal.length <= 60;
  const situationOk = SITUATIONS.some((s) => s.value === situation);
  const verdictOk = ["leave", "help", "uncertain"].includes(verdict ?? "");
  if (!animalOk || !situationOk || !verdictOk) {
    return Response.json({ error: "Invalid case data" }, { status: 400 });
  }

  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("cases")
    .insert({ animal: animal!.trim(), situation, description, verdict, title })
    .select("id")
    .single();

  if (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
  return Response.json({ id: data.id });
}
