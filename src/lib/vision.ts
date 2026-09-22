/**
 * Maps image-classification labels (ImageNet-style, from the in-browser model)
 * onto WildAssist's broad animal categories.
 *
 * This is intentionally conservative: if nothing recognizable matches, we return
 * null so the user picks manually rather than being given a wrong guess. The goal
 * is only to pre-fill the animal *type* (bird / mammal / reptile) and pass a hint
 * to the triage model — not to diagnose species.
 */

import type { AnimalType } from "./triage";

export interface Prediction {
  label: string;
  score: number;
}

export interface VisionResult {
  animal: AnimalType | null;
  /** The top human-readable label, e.g. "American robin". */
  topLabel: string;
  confidence: number;
}

// Distinctive keywords. Reptile/amphibian and bird sets are checked first
// because they're more specific; anything else recognizably an animal falls to
// mammal only via its own keyword set (we never guess "mammal" by elimination).
const REPTILE_WORDS = [
  "turtle", "terrapin", "tortoise", "lizard", "iguana", "gecko", "chameleon",
  "skink", "snake", "serpent", "python", "boa", "cobra", "viper", "crocodile",
  "alligator", "frog", "toad", "salamander", "newt", "bullfrog", "tree frog",
];

const BIRD_WORDS = [
  "bird", "robin", "jay", "magpie", "chickadee", "finch", "sparrow", "starling",
  "cardinal", "crow", "raven", "owl", "hawk", "eagle", "falcon", "kite",
  "vulture", "osprey", "grouse", "ptarmigan", "quail", "partridge", "pheasant",
  "peacock", "turkey", "duck", "drake", "mallard", "goose", "swan", "merganser",
  "heron", "egret", "bittern", "stork", "spoonbill", "flamingo", "crane",
  "coot", "gull", "tern", "pelican", "penguin", "albatross", "cormorant",
  "sandpiper", "plover", "oystercatcher", "woodpecker", "hummingbird", "toucan",
  "hornbill", "macaw", "parrot", "cockatoo", "lorikeet", "bunting", "junco",
  "warbler", "wren", "swallow", "chickadee", "grackle", "loon", "kingfisher",
];

const MAMMAL_WORDS = [
  "rabbit", "hare", "squirrel", "chipmunk", "beaver", "marmot", "groundhog",
  "woodchuck", "porcupine", "raccoon", "opossum", "possum", "skunk", "fox",
  "coyote", "wolf", "bear", "deer", "fawn", "elk", "moose", "hedgehog", "shrew",
  "mole", "mouse", "rat", "vole", "bat", "otter", "mink", "weasel", "ferret",
  "badger", "marten", "fisher", "lynx", "bobcat", "cougar", "muskrat",
  "hamster", "gerbil", "guinea pig",
];

function matchesAny(text: string, words: string[]): boolean {
  return words.some((w) => text.includes(w));
}

/** Reduce the model's top predictions to a single category + hint. */
export function classifyPredictions(preds: Prediction[]): VisionResult {
  const top = preds[0] ?? { label: "", score: 0 };
  const topLabel = top.label.split(",")[0].trim();

  for (const p of preds) {
    const text = p.label.toLowerCase();
    if (matchesAny(text, REPTILE_WORDS))
      return { animal: "reptile", topLabel, confidence: p.score };
    if (matchesAny(text, BIRD_WORDS))
      return { animal: "bird", topLabel, confidence: p.score };
    if (matchesAny(text, MAMMAL_WORDS))
      return { animal: "mammal", topLabel, confidence: p.score };
  }

  return { animal: null, topLabel, confidence: top.score };
}
