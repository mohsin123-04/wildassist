/**
 * Duplicate-report detection. When someone reports an animal that an open case
 * already covers nearby, we flag it so staff can merge rather than dispatch
 * twice. Kept pure and separate so the matching rules are unit-tested.
 */

import { haversineKm } from "./centres";

/** How close (km) and how recent (hours) another report must be to count. */
export const DUP_RADIUS_KM = 2;
export const DUP_WINDOW_HOURS = 24;

// Words that describe the same animal's state/age, not its kind. Stripped before
// comparing so "baby raccoon" and "injured raccoon" match "raccoon".
const QUALIFIERS = new Set([
  "baby", "babies", "juvenile", "young", "adult", "adolescent", "orphaned",
  "injured", "hurt", "sick", "dead", "a", "an", "the", "small", "large",
]);

/** Lowercase, strip punctuation and qualifier words, collapse whitespace. */
export function normalizeAnimal(s: string): string {
  return s
    .toLowerCase()
    .replace(/[^a-z\s-]/g, " ")
    .split(/[\s-]+/)
    .filter((w) => w && !QUALIFIERS.has(w))
    .join(" ")
    .trim();
}

/**
 * Loosely whether two free-text animal descriptions refer to the same kind.
 * Matches exact ("raccoon"/"raccoon"), containment ("duck"/"duckling",
 * "squirrel"/"grey squirrel"), and shared significant word.
 */
export function sameAnimalish(a: string, b: string): boolean {
  const na = normalizeAnimal(a);
  const nb = normalizeAnimal(b);
  if (!na || !nb) return false;
  if (na === nb) return true;
  if (na.includes(nb) || nb.includes(na)) return true;
  const wordsA = new Set(na.split(" "));
  return nb.split(" ").some((w) => w.length >= 4 && wordsA.has(w));
}

export interface DupCandidate {
  id: string;
  animal: string;
  lat: number | null;
  lng: number | null;
}

/**
 * The nearest candidate that is the same kind of animal and within the radius,
 * or null. Candidates should already be filtered to recent, open cases.
 */
export function findDuplicate(
  incoming: { lat: number; lng: number; animal: string },
  candidates: DupCandidate[],
  radiusKm: number = DUP_RADIUS_KM
): string | null {
  let bestKm = Infinity;
  let bestId: string | null = null;
  for (const c of candidates) {
    if (c.lat == null || c.lng == null) continue;
    if (!sameAnimalish(incoming.animal, c.animal)) continue;
    const km = haversineKm(incoming.lat, incoming.lng, c.lat, c.lng);
    if (km <= radiusKm && km < bestKm) {
      bestKm = km;
      bestId = c.id;
    }
  }
  return bestId;
}
