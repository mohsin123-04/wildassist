import { NextRequest } from "next/server";
import { ANIMAL_TYPES, type AnimalType } from "@/lib/triage";
import { allSurveillanceGuidance } from "@/lib/surveillanceGuidance";
import { assessDeceased } from "@/lib/surveillance";
import { rateLimit, clientIp, tooMany } from "@/lib/ratelimit";

/**
 * POST /api/surveillance
 * Body: { animal: AnimalType, description?: string }
 *
 * Returns LLM-generated guidance for a deceased-animal report, grounded in
 * vetted facts about who handles removal, what disease risks apply, and what
 * the finder should do right now. Falls back to the deterministic assessDeceased
 * result on any failure so the endpoint is always reliable.
 */

const GROQ_URL = "https://api.groq.com/openai/v1/chat/completions";
const GROQ_MODEL = process.env.GROQ_MODEL ?? "openai/gpt-oss-120b";

/** Normalize model output to plain ASCII punctuation (no fancy dashes/quotes). */
function toAscii(s: string): string {
  return s
    .replace(/[‐‑]/g, "-")
    .replace(/[‒–—―]/g, ", ")
    .replace(/[''‛]/g, "'")
    .replace(/[""]/g, '"')
    .replace(/…/g, "...")
    .replace(/\s+,/g, ",")
    .trim();
}

export interface SurveillanceResult {
  title: string;
  summary: string;
  whoHandlesRemoval: string;
  risks: { label: string; why: string; action: string }[];
  handling: string[];
  source: "ai" | "rules";
}

function isValidResult(x: unknown): x is Omit<SurveillanceResult, "source"> {
  if (!x || typeof x !== "object") return false;
  const r = x as Record<string, unknown>;
  return (
    typeof r.title === "string" &&
    typeof r.summary === "string" &&
    typeof r.whoHandlesRemoval === "string" &&
    Array.isArray(r.risks) &&
    r.risks.every(
      (ri) =>
        ri &&
        typeof ri === "object" &&
        typeof (ri as Record<string, unknown>).label === "string" &&
        typeof (ri as Record<string, unknown>).why === "string" &&
        typeof (ri as Record<string, unknown>).action === "string"
    ) &&
    Array.isArray(r.handling) &&
    r.handling.every((h) => typeof h === "string")
  );
}

function sanitize(r: Omit<SurveillanceResult, "source">): Omit<SurveillanceResult, "source"> {
  return {
    title: toAscii(r.title),
    summary: toAscii(r.summary),
    whoHandlesRemoval: toAscii(r.whoHandlesRemoval),
    risks: r.risks.map((ri) => ({
      label: toAscii(ri.label),
      why: toAscii(ri.why),
      action: toAscii(ri.action),
    })),
    handling: r.handling.map(toAscii),
  };
}

const SYSTEM_PROMPT = `You are WildAssist, helping a member of the public who has found a dead wild animal. Your job is to:
1. Tell them clearly who is responsible for removing or collecting the carcass (municipality/311, state or provincial wildlife agency, private removal company, public health, or parks staff, depending on WHERE it was found and WHAT species it is).
2. Explain any real public-health or wildlife-disease risks tied to this specific animal, honestly and without exaggerating.
3. Give 3 to 5 concrete safety steps they can take right now.

BASE EVERY FACT ONLY on the VETTED GUIDANCE provided. Do not introduce disease statistics, contact numbers, or species behaviour that is not in the guidance. If the person did not say where the animal was found, cover the most likely scenarios (road, private property) briefly.

TONE: Calm, clear, and helpful. The person may be worried or unsure what to do. Write naturally. No jargon.

STYLE: Plain ASCII punctuation only. No em dashes, en dashes, or curly quotes. Use plain hyphens, commas, or periods instead. Do not use bullet symbols in text fields; each handling step is its own string in the array.

Respond with ONLY a JSON object matching exactly:
{
  "title": string,               // 5 to 9 words, e.g. "Dead raccoon: report it and stay safe"
  "summary": string,             // 2 to 3 plain sentences: what this situation is and why it matters
  "whoHandlesRemoval": string,   // 1 to 3 sentences: who is responsible for removal or collection, and how to reach them
  "risks": [                     // 0 to 3 entries; only include risks clearly supported by the guidance
    {
      "label": string,           // short headline, e.g. "Possible rabies exposure"
      "why": string,             // 1 to 2 sentences explaining the risk for this specific animal
      "action": string           // 1 to 2 sentences: what to do about it
    }
  ],
  "handling": string[]           // 3 to 5 concrete steps, each a full sentence, specific to this animal
}`;

async function askLLM(
  animal: AnimalType,
  description: string
): Promise<Omit<SurveillanceResult, "source"> | null> {
  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) return null;

  const animalLabel =
    ANIMAL_TYPES.find((a) => a.value === animal)?.label ?? animal;

  const userMessage = `A person has found a dead wild animal and needs guidance.

Animal type: ${animalLabel}
Their description: ${description.trim() || "(no description provided)"}

VETTED GUIDANCE (base your answer only on these facts):
${allSurveillanceGuidance()}

Return the JSON guidance now.`;

  try {
    const res = await fetch(GROQ_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: GROQ_MODEL,
        temperature: 0.2,
        response_format: { type: "json_object" },
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          { role: "user", content: userMessage },
        ],
      }),
      signal: AbortSignal.timeout(12000),
    });

    if (!res.ok) return null;
    const data = await res.json();
    const content = data?.choices?.[0]?.message?.content;
    if (typeof content !== "string") return null;

    const parsed = JSON.parse(content);
    return isValidResult(parsed) ? sanitize(parsed) : null;
  } catch {
    return null;
  }
}

/** Deterministic fallback: convert assessDeceased output to SurveillanceResult shape. */
function fallback(animal: AnimalType, description: string): SurveillanceResult {
  const det = assessDeceased(animal, description);
  return {
    title: "Report received",
    summary:
      "Your report has been logged. Here is what to do to stay safe and make sure it is handled correctly.",
    whoHandlesRemoval:
      "For a dead animal on a public road or sidewalk, call your local municipality (usually 311). On private property, contact a licensed wildlife removal company. If this is a disease concern, contact your regional wildlife-health authority.",
    risks: det.risks.map((r) => ({
      label: r.label,
      why: r.why,
      action: r.action,
    })),
    handling: det.handling,
    source: "rules",
  };
}

export async function POST(req: NextRequest) {
  if (!(await rateLimit(`surveillance:${clientIp(req)}`, 20, 60))) return tooMany();

  let body: { animal?: AnimalType; description?: string };
  try {
    body = await req.json();
  } catch {
    return Response.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const { animal, description = "" } = body;
  if (!ANIMAL_TYPES.some((a) => a.value === animal)) {
    return Response.json({ error: "Invalid animal type" }, { status: 400 });
  }

  const ai = await askLLM(animal!, description);
  if (ai) {
    return Response.json({ ...ai, source: "ai" });
  }

  return Response.json(fallback(animal!, description));
}
