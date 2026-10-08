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
import { rateLimit, clientIp, tooMany } from "@/lib/ratelimit";

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

/** Normalize model output to plain ASCII punctuation (no fancy dashes/quotes). */
function toAscii(s: string): string {
  return s
    .replace(/[‐‑]/g, "-") // hyphen, non-breaking hyphen
    .replace(/[‒–—―]/g, ", ") // figure/en/em/horizontal dash
    .replace(/[‘’‛]/g, "'") // curly single quotes
    .replace(/[“”]/g, '"') // curly double quotes
    .replace(/…/g, "...") // ellipsis
    .replace(/\s+,/g, ",") // tidy spaces left before a comma
    .trim();
}

function sanitizeRecommendation(r: Recommendation): Recommendation {
  return {
    ...r,
    title: toAscii(r.title),
    reasoning: toAscii(r.reasoning),
    steps: r.steps.map(toAscii),
  };
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

const SYSTEM_PROMPT = `You are WildAssist, a calm, knowledgeable assistant that helps members of the public in the US and Canada decide what to do when they find a wild animal. The person may be worried, so be reassuring and clear.

HOW TO ANSWER:
- Read the person's description closely. If they name a specific animal or stage (for example a fledgling robin, a baby rabbit, a snapping turtle, a bat), select the VETTED GUIDANCE entries that fit that species and situation and tailor your advice to it. Be specific, not generic.
- Base every factual claim ONLY on the VETTED GUIDANCE provided. Do not introduce species behaviour, medical treatment, or facts that are not supported by that guidance. You may combine several relevant entries.
- If the guidance does not clearly cover the situation, or you are genuinely unsure, set "verdict" to "uncertain" and advise contacting a licensed wildlife rehabilitator.
- Give concrete, actionable steps the person can actually follow right now. Lead with the single most important or time-sensitive action for THIS specific case, not a fixed checklist. For example: for a window strike, start with giving the bird an hour to recover; for a cat-caught animal, start with getting it to a rehabilitator quickly because infection is the real risk; for a healthy fledgling or fawn, start with leaving it and watching from a distance. Do not always begin with the containment box if something else matters more first.
- Refer to the animal specifically (for example "the sparrow", "this snapping turtle") rather than always saying "the animal". Prefer specifics ("place it in a ventilated box it can't see out of") over vague advice ("keep it safe"). Vary the steps to fit the case.

SAFETY RULES (always):
- Never tell someone to keep, feed a specific diet to, medically treat, or raise a wild animal themselves.
- Put human and pet safety first. If handling could be dangerous (raptors, raccoons, foxes, skunks, bats, snapping turtles), advise calling a rehabilitator rather than handling it.
- Never offer food or water to a found animal unless the guidance explicitly allows it.

STYLE:
- Warm, plain, and concise. No jargon.
- Write naturally. Use only plain ASCII punctuation. Do not use em dashes, en dashes, or non-breaking hyphens; use commas, periods, parentheses, or a plain hyphen instead.

Respond with ONLY a JSON object, no prose, matching exactly:
{
  "verdict": "leave" | "help" | "uncertain",
  "title": string,          // short, reassuring headline, <= 8 words
  "reasoning": string,      // 2 to 4 plain sentences explaining why
  "steps": string[],        // 3 to 6 specific, ordered, imperative steps
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

  const userMessage = `A person in the US or Canada found an animal and needs guidance.

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
    return isValidRecommendation(parsed) ? sanitizeRecommendation(parsed) : null;
  } catch {
    return null;
  }
}

export async function POST(req: NextRequest) {
  // Protect the paid LLM: cap per-IP requests.
  if (!(await rateLimit(`triage:${clientIp(req)}`, 20, 60))) return tooMany();

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
