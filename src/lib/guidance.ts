/**
 * Vetted wildlife guidance knowledge base (the "R" in RAG).
 *
 * Each entry is a short, conservative piece of guidance that the LLM is allowed
 * to ground its answer in. The model is instructed NOT to go beyond these.
 *
 * ⚠️ These are paraphrased from general wildlife-rehabilitation guidance and must
 * be reviewed/approved against authoritative Ontario sources (Toronto Wildlife
 * Centre, Ontario SPCA, wildlife rehab councils) before real-world use. Keep the
 * `source` field honest so entries can be audited.
 */

import type { AnimalType, Situation } from "./triage";

export interface GuidanceEntry {
  id: string;
  /** Which animal types this applies to (empty = all). */
  animals: AnimalType[];
  /** Which situations this applies to (empty = all). */
  situations: Situation[];
  text: string;
  source: string;
}

export const GUIDANCE: GuidanceEntry[] = [
  {
    id: "trauma-general",
    animals: [],
    situations: ["bleeding", "hit-by-vehicle", "cant-move"],
    text: "An animal that is bleeding, has been hit by a vehicle, or cannot move, stand, or fly normally is very likely injured and needs a licensed wildlife rehabilitator. Contain it gently in a ventilated box, keep it warm, dark, and quiet, do not offer food or water, and minimize handling.",
    source: "General wildlife-rehab first-response guidance (needs verification).",
  },
  {
    id: "cat-dog-caught",
    animals: [],
    situations: ["caught-by-pet"],
    text: "Any animal caught by a cat or dog needs professional care even if it looks unharmed. Cat and dog saliva carries bacteria that cause fatal infections in wildlife within days. Contain it and contact a rehabilitator promptly; do not wait to 'see if it recovers'.",
    source: "General wildlife-rehab guidance on pet-caught wildlife (needs verification).",
  },
  {
    id: "fledgling-birds",
    animals: ["bird"],
    situations: ["seems-orphaned", "cant-move", "looks-fine-worried"],
    text: "A feathered young bird hopping on the ground that cannot yet fly well is usually a fledgling. This is a normal stage and the parents are typically still feeding it nearby. Leave it alone, keep pets and people away, and watch from a distance. Only intervene if it is featherless, obviously injured, in immediate danger, or the parents are confirmed dead.",
    source: "Common songbird fledgling guidance (needs verification).",
  },
  {
    id: "orphaned-mammals",
    animals: ["mammal"],
    situations: ["seems-orphaned"],
    text: "Many young mammals are left alone for long periods while a parent forages, and are not truly orphaned. Fawns, for example, are deliberately left still and quiet by the doe. Observe from a distance for several hours before acting. Signs an animal genuinely needs help: it is visibly injured, cold, weak, crying continuously, covered in insects, or the parent is known to be dead.",
    source: "General guidance on apparently-orphaned young mammals (needs verification).",
  },
  {
    id: "reptiles-turtles",
    animals: ["reptile"],
    situations: [],
    text: "Injured turtles (including those hit by cars) can often be saved even with a cracked shell, and should go to a rehabilitator or turtle trauma centre quickly. Note the exact location found, as turtles must be released where they came from. Handle minimally and keep them in a ventilated container without water.",
    source: "General turtle/reptile response guidance (needs verification).",
  },
  {
    id: "safety-first",
    animals: [],
    situations: [],
    text: "Human safety comes first. Do not handle raptors, herons, adult raccoons, foxes, skunks, bats, or any animal that could bite or scratch. Call a rehabilitator for advice instead. Bats and other mammals can carry rabies; never handle a bat with bare hands.",
    source: "General wildlife-handling safety guidance (needs verification).",
  },
  {
    id: "do-not-feed",
    animals: [],
    situations: [],
    text: "Do not give food or water to a wild animal you have found. The wrong food or feeding method can cause serious harm, and many injured animals should not be fed at all before assessment. This is one of the most common well-meaning mistakes.",
    source: "General wildlife-rehab intake guidance (needs verification).",
  },
];

/**
 * Retrieve guidance entries relevant to the given animal/situation. An entry
 * with an empty animals/situations list applies broadly. Always includes the
 * universal safety and do-not-feed entries.
 */
export function retrieveGuidance(
  animal: AnimalType,
  situation: Situation
): GuidanceEntry[] {
  const matches = GUIDANCE.filter((g) => {
    const animalOk = g.animals.length === 0 || g.animals.includes(animal);
    const situationOk =
      g.situations.length === 0 || g.situations.includes(situation);
    // Broadly-scoped safety entries (empty on both) are added below; here we
    // want entries that match at least one specific dimension.
    return animalOk && situationOk;
  });

  // De-duplicate while preserving order.
  return Array.from(new Map(matches.map((m) => [m.id, m])).values());
}
