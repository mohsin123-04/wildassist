/**
 * Deterministic danger registry. This is NOT AI-driven: if we have any signal
 * that a found animal could be dangerous to handle, we surface a hard safety
 * warning in the UI regardless of what the triage model says.
 *
 * Guidance here is conservative and general (the right advice for almost any
 * member of the public is "do not handle it, keep your distance, call an
 * expert"), so it stays correct even when we can't identify the exact species.
 */

export interface DangerInfo {
  key: string;
  /** Short label for the warning headline. */
  label: string;
  /** Why it's risky. */
  reason: string;
  /** Whether contact could be a rabies exposure needing public health. */
  rabiesVector?: boolean;
}

export const DANGERS: Record<string, DangerInfo> = {
  snake: {
    key: "snake",
    label: "Do not handle this snake",
    reason:
      "Treat any snake as if it could bite. Most snakes in North America are harmless, but some are venomous (rattlesnakes, copperheads, cottonmouths, and coral snakes), and they can be hard to tell apart. Give it space and let it move away on its own.",
  },
  bat: {
    key: "bat",
    label: "Do not touch this bat",
    reason:
      "Bats can carry rabies, which is fatal once symptoms appear. Never handle a bat with bare hands, and don't try to move it yourself.",
    rabiesVector: true,
  },
  raptor: {
    key: "raptor",
    label: "Do not handle this bird of prey",
    reason:
      "Hawks, owls, eagles, and falcons have powerful talons and beaks that can cause serious injury. They need experienced handling.",
  },
  "fox-coyote": {
    key: "fox-coyote",
    label: "Keep your distance",
    reason:
      "Foxes and coyotes can bite and may carry rabies. Do not approach, corner, or try to handle one.",
    rabiesVector: true,
  },
  raccoon: {
    key: "raccoon",
    label: "Keep your distance",
    reason:
      "Raccoons, skunks, and their relatives can bite and may carry rabies. Do not handle an adult, even if it seems calm or sick.",
    rabiesVector: true,
  },
  "snapping-turtle": {
    key: "snapping-turtle",
    label: "Watch out, snapping turtle",
    reason:
      "Snapping turtles have a long neck and a powerful bite. Keep well clear of the head; if you must move it off a road, use a car mat or shovel.",
  },
};

/**
 * Keyword patterns for each danger, checked against a free-text description,
 * a photo label, or the chosen animal. Order matters: more specific first.
 */
const PATTERNS: { key: string; words: string[] }[] = [
  { key: "snapping-turtle", words: ["snapping turtle", "snapper"] },
  { key: "bat", words: ["bat"] },
  {
    key: "raptor",
    words: ["hawk", "owl", "eagle", "falcon", "osprey", "vulture", "kestrel", "raptor", "bird of prey"],
  },
  {
    key: "fox-coyote",
    words: ["fox", "coyote", "wolf", "jackal"],
  },
  {
    key: "raccoon",
    words: ["raccoon", "racoon", "skunk", "opossum", "possum"],
  },
  {
    key: "snake",
    words: ["snake", "rattlesnake", "rattler", "massasauga", "adder", "viper", "serpent"],
  },
];

/** Detect a danger from any free text (description, photo label, animal name). */
export function detectDanger(...texts: (string | null | undefined)[]): DangerInfo | null {
  const hay = texts.filter(Boolean).join(" ").toLowerCase();
  if (!hay.trim()) return null;
  for (const p of PATTERNS) {
    if (p.words.some((w) => hay.includes(w))) return DANGERS[p.key];
  }
  return null;
}

/** Danger lookup by a specific animal-option value (from photo detection). */
export function dangerForOption(option: string | null): DangerInfo | null {
  if (!option) return null;
  return DANGERS[option] ?? null;
}
