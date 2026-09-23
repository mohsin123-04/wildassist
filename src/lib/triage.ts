/**
 * Triage types, options, and a deterministic rule engine used as a fallback
 * when the LLM is unavailable.
 *
 * The advice here is paraphrased from reputable wildlife-rehabilitation sources
 * (Toronto Wildlife Centre, Ontario SPCA, International Wildlife Rehabilitation
 * Council, Ontario Turtle Conservation Centre, Ontario Nature). It errs toward
 * "contact a licensed rehabilitator" whenever there is doubt. See lib/guidance.ts
 * for the fuller knowledge base the LLM draws on.
 */

export type AnimalType = "bird" | "mammal" | "reptile" | "amphibian" | "unsure";

export type Situation =
  | "bleeding"
  | "hit-by-vehicle"
  | "caught-by-pet"
  | "window-strike"
  | "cant-move"
  | "entangled"
  | "cold-wet-still"
  | "baby-alone"
  | "nest-destroyed"
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

/** Broad categories used for centre matching, guidance retrieval, and rules. */
export const ANIMAL_TYPES: { value: AnimalType; label: string; icon: string }[] = [
  { value: "bird", label: "Bird", icon: "🐦" },
  { value: "mammal", label: "Mammal", icon: "🦝" },
  { value: "reptile", label: "Reptile", icon: "🐢" },
  { value: "amphibian", label: "Amphibian", icon: "🐸" },
  { value: "unsure", label: "I'm not sure", icon: "❓" },
];

/** Specific, recognizable animals shown in the UI. Each maps to a category. */
export interface AnimalOption {
  value: string;
  label: string;
  icon: string;
  category: AnimalType;
}

export const ANIMAL_OPTIONS: AnimalOption[] = [
  { value: "bird", label: "Bird", icon: "🐦", category: "bird" },
  { value: "mammal", label: "Mammal", icon: "🦝", category: "mammal" },
  { value: "reptile", label: "Reptile", icon: "🐢", category: "reptile" },
  { value: "amphibian", label: "Amphibian", icon: "🐸", category: "amphibian" },
  { value: "unsure", label: "I'm not sure", icon: "❓", category: "unsure" },
];

export const SITUATIONS: { value: Situation; label: string }[] = [
  { value: "bleeding", label: "It's bleeding or has an open wound" },
  { value: "hit-by-vehicle", label: "It was hit by a car or bike" },
  { value: "caught-by-pet", label: "A cat or dog got it" },
  { value: "window-strike", label: "It flew into a window" },
  { value: "cant-move", label: "It can't stand, fly, or move normally" },
  { value: "entangled", label: "It's trapped, tangled, or stuck" },
  { value: "cold-wet-still", label: "It's cold, wet, weak, or very still" },
  { value: "baby-alone", label: "It's a baby and seems alone" },
  { value: "nest-destroyed", label: "Its nest fell or was destroyed" },
  { value: "looks-fine-worried", label: "It looks okay but I'm worried" },
  { value: "something-else", label: "Something else" },
];

const CONTAIN_STEPS = [
  "Keep people and pets far away to reduce its stress.",
  "If it's safe, gently move it into a ventilated cardboard box lined with a soft towel. Use a box it can't see out of, not a wire cage.",
  "Keep the box somewhere warm, dark, and quiet, and don't keep checking on it.",
  "Do not offer any food or water, and handle it as little as possible.",
];

/** Situations that almost always mean the animal needs a rehabilitator. */
const CLEAR_TRAUMA: Situation[] = [
  "bleeding",
  "hit-by-vehicle",
  "cant-move",
  "entangled",
  "cold-wet-still",
];

export function recommend(
  animal: AnimalType,
  situation: Situation
): Recommendation {
  if (CLEAR_TRAUMA.includes(situation)) {
    return {
      verdict: "help",
      title: "This animal likely needs help",
      reasoning:
        "What you've described points to injury, illness, or distress. An animal in this state needs a licensed wildlife rehabilitator as soon as possible.",
      steps: CONTAIN_STEPS,
      showContactCentre: true,
    };
  }

  if (situation === "caught-by-pet") {
    return {
      verdict: "help",
      title: "It needs care, even if it looks fine",
      reasoning:
        "Cat and dog saliva carries bacteria that cause deadly infections in wildlife, often within a day or two. Even a tiny scratch needs prompt antibiotic treatment, so this should always be seen by a rehabilitator.",
      steps: [
        "Gently contain it in a ventilated box with a soft towel, away from the pet.",
        "Keep it warm, dark, and quiet, and avoid handling it.",
        "Do not offer food or water.",
        "Contact a wildlife rehabilitator right away. Timing matters here.",
      ],
      showContactCentre: true,
    };
  }

  if (situation === "window-strike") {
    return {
      verdict: "uncertain",
      title: "It may just be stunned",
      reasoning:
        "Birds are often dazed after hitting a window and can recover on their own. But keep it safe from predators while it rests, and watch for signs of real injury.",
      steps: [
        "Gently place it in a ventilated box or paper bag it can't see out of.",
        "Keep it somewhere warm, dark, and quiet, with no food or water.",
        "Leave it undisturbed for about an hour, then check if it's alert.",
        "If it can fly, release it outside. If not, or if it's visibly injured, contact a rehabilitator.",
      ],
      showContactCentre: true,
    };
  }

  if (situation === "baby-alone") {
    return {
      verdict: "uncertain",
      title: "It may not actually need rescuing",
      reasoning:
        "Many baby animals that look abandoned are still being cared for by a parent who forages nearby and returns only occasionally. Removing them does real harm. Some are genuinely orphaned, so it's worth checking before acting.",
      steps: [
        "Watch from a distance for a few hours without touching it. Keep pets and children away so a parent feels safe returning.",
        "For baby birds, a feathered bird hopping on the ground is usually a normal fledgling. Leave it be.",
        "Signs it does need help: it's injured, cold, wet, crying non-stop, covered in insects, or you know the parent is dead.",
        "If any of those are true, contain it gently and contact a rehabilitator.",
      ],
      showContactCentre: true,
    };
  }

  if (situation === "nest-destroyed") {
    return {
      verdict: "uncertain",
      title: "You may be able to reunite them",
      reasoning:
        "A displaced nest can often be restored, and parents will usually keep caring for their young. It's best to try to renest before assuming the babies are orphaned.",
      steps: [
        "If the babies look unhurt, place them and any nesting material into a small container and secure it as close as possible to the original spot.",
        "Watch from a distance for a couple of hours to see if a parent returns.",
        "Keep pets and people well away from the area.",
        "If a parent doesn't return, or a baby is injured or cold, contact a rehabilitator.",
      ],
      showContactCentre: true,
    };
  }

  if (situation === "looks-fine-worried") {
    return {
      verdict: "leave",
      title: "It's probably best to leave it alone",
      reasoning:
        "If the animal looks alert and uninjured, stepping in usually does more harm than good. Wild animals are easily stressed by human contact.",
      steps: [
        "Give it space and keep pets indoors or away.",
        "Check back later from a distance to see if it has moved on.",
        "If its condition changes or it still hasn't moved after several hours, start over and tell us what's different.",
      ],
      showContactCentre: false,
    };
  }

  return {
    verdict: "uncertain",
    title: "Let's get an expert's eyes on it",
    reasoning:
      "From what you've told us it's hard to be certain. When in doubt, a licensed wildlife rehabilitator can tell you the right thing to do. It's always safest to ask before acting.",
    steps: [
      "Don't attempt any treatment yourself.",
      "Keep people and pets away from the animal.",
      "Note the exact location so a rehabilitator can advise or respond.",
    ],
    showContactCentre: true,
  };
}
