import { describe, it, expect } from "vitest";
import {
  haversineKm,
  rankCentres,
  ONTARIO_CENTRES,
  type Centre,
} from "../centres";

describe("haversineKm()", () => {
  it("is zero for the same point", () => {
    expect(haversineKm(43.65, -79.38, 43.65, -79.38)).toBeCloseTo(0, 5);
  });

  it("is symmetric", () => {
    const a = haversineKm(43.65, -79.38, 45.42, -75.7);
    const b = haversineKm(45.42, -75.7, 43.65, -79.38);
    expect(a).toBeCloseTo(b, 9);
  });

  it("approximates a known distance (Toronto to Ottawa ~350km)", () => {
    const d = haversineKm(43.65, -79.38, 45.42, -75.7);
    expect(d).toBeGreaterThan(330);
    expect(d).toBeLessThan(370);
  });

  it("approximates one degree of latitude as ~111km", () => {
    expect(haversineKm(0, 0, 1, 0)).toBeCloseTo(111.19, 0);
  });
});

describe("rankCentres()", () => {
  // A user standing at the Toronto Wildlife Centre.
  const TWC = ONTARIO_CENTRES.find((c) => c.id === "toronto-wildlife-centre")!;

  it("sorts nearest first", () => {
    const ranked = rankCentres(TWC.lat, TWC.lng);
    expect(ranked[0].id).toBe("toronto-wildlife-centre");
    for (let i = 1; i < ranked.length; i++) {
      expect(ranked[i].distanceKm).toBeGreaterThanOrEqual(ranked[i - 1].distanceKm);
    }
  });

  it("attaches a numeric distance to every centre", () => {
    const ranked = rankCentres(TWC.lat, TWC.lng);
    expect(ranked).toHaveLength(ONTARIO_CENTRES.length);
    for (const c of ranked) {
      expect(typeof c.distanceKm).toBe("number");
      expect(Number.isFinite(c.distanceKm)).toBe(true);
    }
  });

  it("ranks a centre that takes the animal ahead of a nearer one that doesn't", () => {
    const centres: Centre[] = [
      { id: "near-no-reptile", name: "Near", town: "", lat: 0.1, lng: 0, takes: ["bird"] },
      { id: "far-takes-reptile", name: "Far", town: "", lat: 5, lng: 0, takes: ["reptile"] },
    ];
    const ranked = rankCentres(0, 0, "reptile", centres);
    // The reptile-capable centre wins even though it is much farther away.
    expect(ranked[0].id).toBe("far-takes-reptile");
  });

  it("ignores the animal filter when animal is unsure (pure distance)", () => {
    const centres: Centre[] = [
      { id: "near", name: "Near", town: "", lat: 0.1, lng: 0, takes: ["bird"] },
      { id: "far", name: "Far", town: "", lat: 5, lng: 0, takes: ["reptile"] },
    ];
    const ranked = rankCentres(0, 0, "unsure", centres);
    expect(ranked[0].id).toBe("near");
  });

  it("does not mutate the source array", () => {
    const before = ONTARIO_CENTRES.map((c) => c.id);
    rankCentres(TWC.lat, TWC.lng);
    expect(ONTARIO_CENTRES.map((c) => c.id)).toEqual(before);
  });
});

describe("ONTARIO_CENTRES seed data", () => {
  it("has unique ids", () => {
    const ids = ONTARIO_CENTRES.map((c) => c.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("has plausible Canadian coordinates and at least one accepted animal", () => {
    for (const c of ONTARIO_CENTRES) {
      expect(c.lat).toBeGreaterThan(40);
      expect(c.lat).toBeLessThan(84);
      expect(c.lng).toBeGreaterThan(-141);
      expect(c.lng).toBeLessThan(-52);
      expect(c.takes.length).toBeGreaterThan(0);
    }
  });
});
