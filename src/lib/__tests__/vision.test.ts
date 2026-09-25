import { describe, it, expect } from "vitest";
import { classifyPredictions, type Prediction } from "../vision";

const p = (label: string, score = 0.9): Prediction => ({ label, score });

// The vision mapper only pre-fills a hint, so "unknown -> null" matters as much
// as a correct match: a wrong guess is worse than asking the user to pick.
describe("classifyPredictions()", () => {
  it("maps a specific label to a specific option + category", () => {
    const r = classifyPredictions([p("fox squirrel", 0.82)]);
    expect(r.option).toBe("squirrel");
    expect(r.category).toBe("mammal");
    expect(r.topLabel).toBe("fox squirrel");
    expect(r.confidence).toBeCloseTo(0.82);
  });

  it("takes the top label as the text before the first comma", () => {
    const r = classifyPredictions([p("tabby, tabby cat")]);
    expect(r.topLabel).toBe("tabby");
  });

  it("maps raptors to the raptor option", () => {
    expect(classifyPredictions([p("great grey owl")]).option).toBe("raptor");
    expect(classifyPredictions([p("bald eagle")]).category).toBe("bird");
  });

  it("maps waterfowl to duck-goose", () => {
    expect(classifyPredictions([p("drake")]).option).toBe("duck-goose");
  });

  it("falls back to a broad category when no specific option matches", () => {
    const r = classifyPredictions([p("green lizard")]);
    expect(r.option).toBeNull();
    expect(r.category).toBe("reptile");
  });

  it("returns nulls (but keeps label/confidence) when nothing matches", () => {
    const r = classifyPredictions([p("espresso maker", 0.77)]);
    expect(r.option).toBeNull();
    expect(r.category).toBeNull();
    expect(r.topLabel).toBe("espresso maker");
    expect(r.confidence).toBeCloseTo(0.77);
  });

  it("scans predictions in order and returns the first that matches", () => {
    // Top prediction is not an animal; the second one is a songbird.
    const r = classifyPredictions([p("toaster", 0.9), p("American robin", 0.4)]);
    expect(r.option).toBe("songbird");
    expect(r.category).toBe("bird");
    // Confidence reflects the matched prediction, not the top one.
    expect(r.confidence).toBeCloseTo(0.4);
    // topLabel still reflects the model's top prediction.
    expect(r.topLabel).toBe("toaster");
  });

  it("handles an empty prediction list", () => {
    const r = classifyPredictions([]);
    expect(r.option).toBeNull();
    expect(r.category).toBeNull();
    expect(r.topLabel).toBe("");
    expect(r.confidence).toBe(0);
  });
});
