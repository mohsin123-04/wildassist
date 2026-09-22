import { NextRequest } from "next/server";
import {
  recommend,
  ANIMAL_TYPES,
  SITUATIONS,
  type AnimalType,
  type Situation,
  type Recommendation,
} from "@/lib/triage";
import { retrieveGuidance } from "@/lib/guidance";

/**
 * POST /api/triage
 * Body: { animal: AnimalType, situation: Situation, description?: string }
 * Returns: Recommendation (+ `source: "ai" | "rules"`)
 *
 * Uses Groq's free-tier LLM when GROQ_API_KEY is set, grounded in vetted
 * guidance. Falls back to the deterministic rule engine on any problem so the
 * endpoint is always reliable.
 */

const GROQ_URL = "https://api.groq.com/openai/v1/chat/completions";
const GROQ_MODEL = process.env.GROQ_MODEL ?? "openai/gpt-oss-120b";

const VALID_VERDICTS = ["leave", "help", "uncertain"];

function labelFor<T extends string>(
  list: { value: T; label: string }[],
  value: T
): string {
  return list.find((x) => x.value === value)?.label ?? value;
}

function isValidRecommendation(x: unknown): x is Recommendation {
  if (!x || typeof x !== "object") return false;
  const r = x as Record<string, unknown>;
  return (
    typeof r.verdict === "string" &&
    VALID_VERDICTS.includes(r.verdict) &&
    typeof r.title === "string" &&
    typeof r.reasoning === "string" &&
    Array.isArray(r.steps) &&
    r.steps.every((s) => typeof s === "string") &&
    typeof r.showContactCentre === "boolean"
  );
}

const SYSTEM_PROMPT = `You are WildAssist, a careful assistant that helps members of the public in Ontario, Canada decide what to do when they find a wild animal.

STRICT RULES:
- Base your advice ONLY on the VETTED GUIDANCE provided in the user message. Do not introduce facts, species behaviour, or medical/veterinary treatment that is not supported by that guidance.
- If the guidance does not clearly cover the situation, or you are unsure, set "verdict" to "uncertain" and advise contacting a licensed wildlife rehabilitator.
- Never tell someone to keep, feed a specific diet to, medically treat, or raise a wild animal themselves.
- Put human and pet safety first. If handling could be dangerous (raptors, raccoons, foxes, skunks, bats, etc.), advise calling a rehabilitator instead of handling.
- Keep it calm, plain, and brief.
- Write naturally. Do not use em dashes or en dashes; use commas, periods, or parentheses instead.

Respond with ONLY a JSON object, no prose, matching exactly:
{
  "verdict": "leave" | "help" | "uncertain",
  "title": string,          // short headline, <= 8 words
  "reasoning": string,      // 2-3 plain sentences
  "steps": string[],        // 2-5 short imperative steps
  "showContactCentre": boolean  // true if the person should be offered nearby centres
}`;

async function askLLM(
  animal: AnimalType,
  situation: Situation,
  description: string
): Promise<Recommendation | null> {
  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) return null;

  const guidance = retrieveGuidance(animal, situation)
    .map((g, i) => `${i + 1}. ${g.text}`)
    .join("\n");

  const userMessage = `A person in Ontario found an animal and needs guidance.

Animal type: ${labelFor(ANIMAL_TYPES, animal)}
Situation they selected: ${labelFor(SITUATIONS, situation)}
Their description: ${description.trim() || "(none provided)"}

VETTED GUIDANCE (only use these facts):
${guidance || "(no specific guidance matched, treat as uncertain and recommend contacting a rehabilitator)"}

Return the JSON recommendation now.`;

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
      // Don't let a slow model hang the request forever.
      signal: AbortSignal.timeout(12000),
    });

    if (!res.ok) return null;
    const data = await res.json();
    const content = data?.choices?.[0]?.message?.content;
    if (typeof content !== "string") return null;

    const parsed = JSON.parse(content);
    return isValidRecommendation(parsed) ? parsed : null;
  } catch {
    return null;
  }
}

export async function POST(req: NextRequest) {
  let body: { animal?: AnimalType; situation?: Situation; description?: string };
  try {
    body = await req.json();
  } catch {
    return Response.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const { animal, situation, description = "" } = body;

  const animalOk = ANIMAL_TYPES.some((a) => a.value === animal);
  const situationOk = SITUATIONS.some((s) => s.value === situation);
  if (!animalOk || !situationOk) {
    return Response.json(
      { error: "Missing or invalid animal/situation" },
      { status: 400 }
    );
  }

  const ai = await askLLM(animal!, situation!, description);
  if (ai) {
    return Response.json({ ...ai, source: "ai" });
  }

  // Fallback: deterministic rules.
  return Response.json({ ...recommend(animal!, situation!), source: "rules" });
}
