import { describe, it, expect } from "vitest";
import {
  normalizeAnimal,
  sameAnimalish,
  findDuplicate,
  type DupCandidate,
} from "../dedup";

describe("normalizeAnimal()", () => {
  it("lowercases, trims, and strips state/age qualifiers", () => {
    expect(normalizeAnimal("Baby Raccoon")).toBe("raccoon");
    expect(normalizeAnimal("  Injured ADULT fox ")).toBe("fox");
    expect(normalizeAnimal("a small bird!")).toBe("bird");
  });
});

describe("sameAnimalish()", () => {
  it("matches exact and qualifier-only differences", () => {
    expect(sameAnimalish("raccoon", "raccoon")).toBe(true);
    expect(sameAnimalish("baby raccoon", "raccoon")).toBe(true);
    expect(sameAnimalish("injured Raccoon", "baby raccoon")).toBe(true);
  });

  it("matches containment and word overlap", () => {
    expect(sameAnimalish("duck", "duckling")).toBe(true);
    expect(sameAnimalish("grey squirrel", "squirrel")).toBe(true);
    expect(sameAnimalish("red fox", "fox")).toBe(true);
    expect(sameAnimalish("snapping turtle", "turtle")).toBe(true);
  });

  it("does not match different animals", () => {
    expect(sameAnimalish("raccoon", "squirrel")).toBe(false);
    expect(sameAnimalish("duck", "goose")).toBe(false);
    expect(sameAnimalish("fox", "frog")).toBe(false);
  });

  it("returns false for empty-ish input", () => {
    expect(sameAnimalish("", "raccoon")).toBe(false);
    expect(sameAnimalish("adult", "raccoon")).toBe(false); // qualifier only
  });
});

describe("findDuplicate()", () => {
  const here = { lat: 43.65, lng: -79.38, animal: "baby raccoon" };

  it("flags the nearest same-kind case within the radius", () => {
    const candidates: DupCandidate[] = [
      { id: "far", animal: "raccoon", lat: 43.8, lng: -79.6 }, // ~25km
      { id: "near", animal: "raccoon", lat: 43.651, lng: -79.381 }, // ~130m
    ];
    expect(findDuplicate(here, candidates)).toBe("near");
  });

  it("ignores different animals even if closer", () => {
    const candidates: DupCandidate[] = [
      { id: "sameSpot-otherAnimal", animal: "squirrel", lat: 43.65, lng: -79.38 },
      { id: "raccoon-nearby", animal: "raccoon", lat: 43.652, lng: -79.382 },
    ];
    expect(findDuplicate(here, candidates)).toBe("raccoon-nearby");
  });

  it("returns null when the nearest same-kind case is beyond the radius", () => {
    const candidates: DupCandidate[] = [
      { id: "far", animal: "raccoon", lat: 44.0, lng: -79.9 },
    ];
    expect(findDuplicate(here, candidates)).toBeNull();
  });

  it("skips candidates without coordinates", () => {
    const candidates: DupCandidate[] = [
      { id: "nocoords", animal: "raccoon", lat: null, lng: null },
    ];
    expect(findDuplicate(here, candidates)).toBeNull();
  });

  it("respects a custom radius", () => {
    const candidates: DupCandidate[] = [
      { id: "x", animal: "raccoon", lat: 43.66, lng: -79.38 }, // ~1.1km
    ];
    expect(findDuplicate(here, candidates, 0.5)).toBeNull();
    expect(findDuplicate(here, candidates, 2)).toBe("x");
  });
});
