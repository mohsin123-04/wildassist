import { describe, it, expect } from "vitest";
import {
  recommend,
  ANIMAL_OPTIONS,
  ANIMAL_TYPES,
  SITUATIONS,
  type AnimalType,
  type Situation,
} from "../triage";

// The triage engine is the deterministic fallback used when the LLM is
// unavailable, so its verdicts must stay stable and safe.
describe("recommend()", () => {
  // Any sign of trauma should route to help + contain steps, for every animal.
  const CLEAR_TRAUMA: Situation[] = [
    "bleeding",
    "hit-by-vehicle",
    "cant-move",
    "entangled",
    "cold-wet-still",
  ];

  it.each(CLEAR_TRAUMA)("treats %s as a help case", (situation) => {
    const r = recommend("bird", situation);
    expect(r.verdict).toBe("help");
    expect(r.showContactCentre).toBe(true);
    expect(r.steps.length).toBeGreaterThan(0);
  });

  it("gives the same trauma verdict regardless of animal type", () => {
    const animals: AnimalType[] = ["bird", "mammal", "reptile", "amphibian", "fish", "unsure"];
    for (const a of animals) {
      expect(recommend(a, "bleeding").verdict).toBe("help");
    }
  });

  it("always recommends help after a pet attack, even if it looks fine", () => {
    const r = recommend("mammal", "caught-by-pet");
    expect(r.verdict).toBe("help");
    expect(r.showContactCentre).toBe(true);
    // The reasoning must mention the infection risk that drives this rule.
    expect(r.reasoning.toLowerCase()).toContain("infection");
  });

  it("treats a window strike as uncertain (may just be stunned)", () => {
    const r = recommend("bird", "window-strike");
    expect(r.verdict).toBe("uncertain");
    expect(r.showContactCentre).toBe(true);
  });

  it("treats a lone baby as uncertain (may not need rescuing)", () => {
    expect(recommend("bird", "baby-alone").verdict).toBe("uncertain");
  });

  it("treats a destroyed nest as uncertain (renest first)", () => {
    expect(recommend("bird", "nest-destroyed").verdict).toBe("uncertain");
  });

  it("says leave it alone when it looks fine, and hides the centre CTA", () => {
    const r = recommend("mammal", "looks-fine-worried");
    expect(r.verdict).toBe("leave");
    expect(r.showContactCentre).toBe(false);
  });

  it("falls back to uncertain + expert advice for something-else", () => {
    const r = recommend("unsure", "something-else");
    expect(r.verdict).toBe("uncertain");
    expect(r.showContactCentre).toBe(true);
  });

  it("returns non-empty title, reasoning, and steps for every situation", () => {
    for (const { value } of SITUATIONS) {
      const r = recommend("bird", value);
      expect(r.title.length).toBeGreaterThan(0);
      expect(r.reasoning.length).toBeGreaterThan(0);
      expect(Array.isArray(r.steps)).toBe(true);
      expect(r.steps.length).toBeGreaterThan(0);
    }
  });
});

describe("triage option tables", () => {
  it("maps every animal option to a known category", () => {
    const categories = new Set(ANIMAL_TYPES.map((t) => t.value));
    for (const o of ANIMAL_OPTIONS) {
      expect(categories.has(o.category)).toBe(true);
    }
  });

  it("has no duplicate situation values", () => {
    const values = SITUATIONS.map((s) => s.value);
    expect(new Set(values).size).toBe(values.length);
  });
});
