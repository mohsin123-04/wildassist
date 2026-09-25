import { describe, it, expect } from "vitest";
import { detectDanger, dangerForOption, DANGERS } from "../safety";

// The danger registry is a hard safety layer that runs regardless of the AI.
// A miss here could put a member of the public at risk, so cover it carefully.
describe("detectDanger()", () => {
  it("flags a bat as a rabies vector", () => {
    const d = detectDanger("I found a bat on the ground");
    expect(d?.key).toBe("bat");
    expect(d?.rabiesVector).toBe(true);
  });

  it("flags foxes and coyotes as rabies vectors", () => {
    expect(detectDanger("a fox in my yard")?.key).toBe("fox-coyote");
    expect(detectDanger("looks like a coyote")?.rabiesVector).toBe(true);
  });

  it("flags raccoons, skunks, and opossums together", () => {
    expect(detectDanger("a raccoon")?.key).toBe("raccoon");
    expect(detectDanger("a skunk")?.key).toBe("raccoon");
    expect(detectDanger("an opossum")?.key).toBe("raccoon");
  });

  it("flags birds of prey", () => {
    expect(detectDanger("a hawk")?.key).toBe("raptor");
    expect(detectDanger("great grey owl")?.key).toBe("raptor");
  });

  it("prefers the specific snapping-turtle warning over generic snake", () => {
    // "snapping turtle" is checked before the snake pattern (order matters).
    expect(detectDanger("a snapping turtle on the road")?.key).toBe(
      "snapping-turtle"
    );
  });

  it("flags snakes generically", () => {
    expect(detectDanger("a garter snake")?.key).toBe("snake");
    expect(detectDanger("massasauga rattlesnake")?.key).toBe("snake");
  });

  it("is case-insensitive", () => {
    expect(detectDanger("BAT")?.key).toBe("bat");
    expect(detectDanger("RaCcOoN")?.key).toBe("raccoon");
  });

  it("joins multiple text sources (description + photo label + animal)", () => {
    expect(detectDanger("found an animal", null, "owl")?.key).toBe("raptor");
  });

  it("returns null for a harmless animal", () => {
    expect(detectDanger("a robin hopping around")).toBeNull();
    expect(detectDanger("small duck")).toBeNull();
  });

  it("returns null for empty / nullish input", () => {
    expect(detectDanger()).toBeNull();
    expect(detectDanger(null, undefined, "")).toBeNull();
    expect(detectDanger("   ")).toBeNull();
  });

  it("only ever returns entries that exist in the registry", () => {
    const d = detectDanger("a bat");
    expect(d && DANGERS[d.key]).toBe(d);
  });
});

describe("dangerForOption()", () => {
  it("looks up a danger by animal-option value", () => {
    expect(dangerForOption("bat")?.key).toBe("bat");
    expect(dangerForOption("snake")?.key).toBe("snake");
  });

  it("returns null for a safe option or missing value", () => {
    expect(dangerForOption("squirrel")).toBeNull();
    expect(dangerForOption(null)).toBeNull();
  });
});
