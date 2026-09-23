/**
 * Maps image-classification labels (ImageNet-style, from the in-browser model)
 * onto WildAssist's specific animal options where possible, falling back to a
 * broad category, or null if nothing recognizable matches.
 *
 * This only pre-fills the animal choice and gives the triage model a hint; it is
 * not a diagnosis. When unsure it returns null so the user picks manually.
 */

import type { AnimalType } from "./triage";

export interface Prediction {
  label: string;
  score: number;
}

export interface VisionResult {
  /** A specific ANIMAL_OPTIONS value (e.g. "squirrel") when confident. */
  option: string | null;
  /** The broad category, when at least that is known. */
  category: AnimalType | null;
  /** The top human-readable label, e.g. "fox squirrel". */
  topLabel: string;
  confidence: number;
}

// Ordered specific-animal keyword sets. Checked before broad categories.
const OPTION_WORDS: { option: string; category: AnimalType; words: string[] }[] = [
  { option: "squirrel", category: "mammal", words: ["squirrel", "chipmunk", "marmot"] },
  { option: "rabbit", category: "mammal", words: ["rabbit", "hare", "bunny", "cottontail"] },
  { option: "raccoon", category: "mammal", words: ["raccoon", "skunk", "opossum", "possum", "polecat"] },
  { option: "deer", category: "mammal", words: ["deer", "fawn", "elk", "moose", "stag", "doe", "hartebeest"] },
  { option: "fox-coyote", category: "mammal", words: ["fox", "coyote", "wolf", "jackal", "dingo"] },
  { option: "bat", category: "mammal", words: ["bat"] },
  { option: "turtle", category: "reptile", words: ["turtle", "terrapin", "tortoise"] },
  { option: "snake", category: "reptile", words: ["snake", "serpent", "boa", "python", "cobra", "viper", "mamba", "adder", "garter", "rattlesnake"] },
  { option: "frog-toad", category: "reptile", words: ["frog", "toad", "bullfrog", "salamander", "newt"] },
  { option: "duck-goose", category: "bird", words: ["goose", "duck", "drake", "mallard", "merganser", "teal", "swan", "goosander"] },
  { option: "raptor", category: "bird", words: ["owl", "hawk", "eagle", "falcon", "kite", "vulture", "osprey", "buzzard", "harrier", "kestrel"] },
  { option: "songbird", category: "bird", words: ["robin", "jay", "finch", "sparrow", "chickadee", "magpie", "junco", "warbler", "wren", "starling", "bulbul", "bunting", "oriole", "cardinal", "titmouse", "nuthatch", "thrush", "grackle", "blackbird", "chickadee", "lorikeet", "hummingbird"] },
];

// Broad fallbacks, in case a specific option doesn't match but the category is clear.
const CATEGORY_WORDS: { category: AnimalType; words: string[] }[] = [
  { category: "reptile", words: ["lizard", "iguana", "gecko", "chameleon", "skink", "crocodile", "alligator"] },
  { category: "bird", words: ["bird", "peacock", "quail", "partridge", "pheasant", "grouse", "heron", "egret", "stork", "crane", "pelican", "cormorant", "woodpecker", "toucan", "hornbill", "parrot", "cockatoo", "gull", "tern"] },
  { category: "mammal", words: ["mouse", "rat", "vole", "shrew", "mole", "beaver", "porcupine", "hedgehog", "otter", "mink", "weasel", "badger", "marten", "muskrat"] },
];

function matches(text: string, words: string[]): boolean {
  return words.some((w) => text.includes(w));
}

/** Reduce the model's top predictions to a specific option, category, and hint. */
export function classifyPredictions(preds: Prediction[]): VisionResult {
  const top = preds[0] ?? { label: "", score: 0 };
  const topLabel = top.label.split(",")[0].trim();

  for (const p of preds) {
    const text = p.label.toLowerCase();
    for (const o of OPTION_WORDS) {
      if (matches(text, o.words)) {
        return { option: o.option, category: o.category, topLabel, confidence: p.score };
      }
    }
    for (const c of CATEGORY_WORDS) {
      if (matches(text, c.words)) {
        return { option: null, category: c.category, topLabel, confidence: p.score };
      }
    }
  }

  return { option: null, category: null, topLabel, confidence: top.score };
}
