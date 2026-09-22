/**
 * Triage decision logic (PLACEHOLDER).
 *
 * This is deliberately isolated from the UI so it can be swapped out later for
 * the real engine: a vision model (species ID from a photo) + an LLM grounded
 * via RAG in vetted Ontario wildlife-rehabilitation guidance.
 *
 * ⚠️ The rules below are simplified stand-ins, NOT authoritative wildlife advice.
 * They intentionally err toward "contact a licensed rehabilitator" whenever there
 * is any doubt. Real guidance must be sourced from reputable organizations
 * (e.g. Toronto Wildlife Centre, Ontario SPCA, wildlife rehab councils) before
 * this ships to real users.
 */

export type AnimalType = "bird" | "mammal" | "reptile" | "unsure";

export type Situation =
  | "bleeding"
  | "hit-by-vehicle"
  | "caught-by-pet"
  | "cant-move"
  | "seems-orphaned"
  | "looks-fine-worried"
  | "something-else";

export type Verdict = "leave" | "help" | "uncertain";

export interface Recommendation {
  verdict: Verdict;
  title: string;
  reasoning: string;
  steps: string[];
  /** Whether to surface the "find a nearby centre" call-to-action. */
  showContactCentre: boolean;
}

export const ANIMAL_TYPES: { value: AnimalType; label: string; icon: string }[] = [
  { value: "bird", label: "Bird", icon: "🐦" },
  { value: "mammal", label: "Mammal", icon: "🦝" },
  { value: "reptile", label: "Reptile or amphibian", icon: "🐢" },
  { value: "unsure", label: "I'm not sure", icon: "❓" },
];

export const SITUATIONS: { value: Situation; label: string }[] = [
  { value: "bleeding", label: "It's bleeding or has a visible injury" },
  { value: "hit-by-vehicle", label: "It was hit by a car or bike" },
  { value: "caught-by-pet", label: "A cat or dog caught it" },
  { value: "cant-move", label: "It can't move, fly, or stand normally" },
  { value: "seems-orphaned", label: "It's a baby and seems alone" },
  { value: "looks-fine-worried", label: "It looks okay but I'm worried" },
  { value: "something-else", label: "Something else" },
];

const CONTAIN_STEPS = [
  "Keep people and pets far away to reduce its stress.",
  "If it's safe, gently place it in a ventilated cardboard box lined with a towel.",
  "Keep it somewhere warm, dark, and quiet. Do not offer food or water.",
  "Do not handle it more than necessary, and wash your hands afterward.",
];

/**
 * These situations indicate clear trauma — the animal almost always needs a
 * licensed rehabilitator regardless of species.
 */
const CLEAR_TRAUMA: Situation[] = [
  "bleeding",
  "hit-by-vehicle",
  "caught-by-pet",
  "cant-move",
];

export function recommend(
  animal: AnimalType,
  situation: Situation
): Recommendation {
  // Clear trauma → needs help.
  if (CLEAR_TRAUMA.includes(situation)) {
    const catDogNote =
      situation === "caught-by-pet"
        ? " Cat and dog saliva can cause fatal infections in wildlife, so even small wounds need professional care."
        : "";
    return {
      verdict: "help",
      title: "This animal likely needs help",
      reasoning:
        "The situation you described points to a possible injury." + catDogNote,
      steps: CONTAIN_STEPS,
      showContactCentre: true,
    };
  }

  // "Seems orphaned" is the classic case where intervention is often wrong.
  if (situation === "seems-orphaned") {
    return {
      verdict: "uncertain",
      title: "It may not actually need rescuing",
      reasoning:
        "Many baby animals that look abandoned are being cared for by a parent " +
        "who is nearby or only returns occasionally. Removing them can do harm. " +
        "But some are genuinely orphaned — it's worth checking with an expert before acting.",
      steps: [
        "Watch from a distance for a few hours without touching the animal.",
        "Keep pets and children away so a parent feels safe returning.",
        "If it's clearly injured, cold, or a parent is known to be dead, treat it as needing help.",
      ],
      showContactCentre: true,
    };
  }

  if (situation === "looks-fine-worried") {
    return {
      verdict: "leave",
      title: "It's probably best to leave it alone",
      reasoning:
        "If the animal looks alert and uninjured, intervening usually does more " +
        "harm than good. Wild animals are easily stressed by human contact.",
      steps: [
        "Give it space and keep pets indoors or away.",
        "Check back later from a distance to see if it has moved on.",
        "If its condition changes or it still hasn't moved after several hours, come back and start over.",
      ],
      showContactCentre: false,
    };
  }

  // Default / "something else" / unknown → be cautious and route to an expert.
  return {
    verdict: "uncertain",
    title: "Let's get a real expert involved",
    reasoning:
      "From what you've told us, it's hard to be sure. When in doubt, a licensed " +
      "wildlife rehabilitator can tell you the right thing to do — it's always " +
      "safest to ask before acting.",
    steps: [
      "Don't attempt treatment yourself.",
      "Keep people and pets away from the animal.",
      "Note the exact location so a rehabilitator can advise or respond.",
    ],
    showContactCentre: true,
  };
}
