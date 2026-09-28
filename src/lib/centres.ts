/**
 * Canadian wildlife rehabilitation centres (SEED DATA).
 *
 * Contact details (website + phone) were verified against each centre's
 * official site in Sept 2026. Coordinates are approximate (town-level). Intake
 * capacity, accepted species, and hours change seasonally, so always confirm by
 * phone. This list is a starting point, not authoritative.
 */

import type { AnimalType } from "./triage";

export type FacilityType =
  | "rehab_centre"
  | "vet"
  | "animal_hospital"
  | "humane_society"
  | "hotline"
  | "sanctuary";

/** Human labels for each facility type. */
export const FACILITY_TYPES: Record<FacilityType, string> = {
  rehab_centre: "Rehabilitation centre",
  vet: "Veterinary clinic",
  animal_hospital: "Animal hospital",
  humane_society: "Humane society / SPCA",
  hotline: "Wildlife hotline",
  sanctuary: "Sanctuary",
};

export interface Centre {
  id: string;
  name: string;
  town: string;
  lat: number;
  lng: number;
  /** Broad categories this centre is generally known to accept. */
  takes: AnimalType[];
  phone?: string;
  website?: string;
  notes?: string;
  type?: FacilityType;
  /** Directory listing only: shown for reference, but not assigned cases. */
  directory_only?: boolean;
  /** "Canada" or "United States". Drives distance units (km vs mi). */
  country?: string | null;
  /** Province or state. */
  state?: string | null;
}

/** True for US facilities (distances shown in miles rather than km). */
function isUS(country?: string | null): boolean {
  const c = (country ?? "").toLowerCase();
  return c === "united states" || c === "usa" || c === "us";
}

/**
 * Distance label in the units of the facility's country: miles for the US,
 * kilometres elsewhere. e.g. "12 km" or "8 mi".
 */
export function formatDistance(km: number, country?: string | null): string {
  if (isUS(country)) {
    const mi = km * 0.621371;
    return `${mi < 10 ? mi.toFixed(1) : Math.round(mi)} mi`;
  }
  return `${km < 10 ? km.toFixed(1) : Math.round(km)} km`;
}

export const ONTARIO_CENTRES: Centre[] = [
  {
    id: "toronto-wildlife-centre",
    name: "Toronto Wildlife Centre",
    town: "Toronto (Downsview Park)",
    lat: 43.7315,
    lng: -79.476,
    takes: ["bird", "mammal", "reptile"],
    phone: "416-631-0662",
    website: "https://www.torontowildlifecentre.com",
    notes: "Canada's largest wildlife centre. Operates a wildlife hotline.",
  },
  {
    id: "shades-of-hope",
    name: "Shades of Hope Wildlife Refuge",
    town: "Pefferlaw",
    lat: 44.323,
    lng: -79.183,
    takes: ["bird", "mammal", "reptile"],
    website: "https://www.shadesofhope.ca",
  },
  {
    id: "procyon-wildlife",
    name: "Procyon Wildlife",
    town: "Beeton",
    lat: 44.082,
    lng: -79.79,
    takes: ["mammal"],
    website: "https://procyonwildlife.com",
  },
  {
    id: "sandy-pines",
    name: "Sandy Pines Wildlife Centre",
    town: "Napanee",
    lat: 44.25,
    lng: -76.95,
    takes: ["bird", "mammal", "reptile"],
    website: "https://sandypineswildlife.org",
  },
  {
    id: "aspen-valley",
    name: "Aspen Valley Wildlife Sanctuary",
    town: "Rosseau (Muskoka)",
    lat: 45.19,
    lng: -79.55,
    takes: ["mammal"],
    website: "https://aspenvalley.ca",
  },
  {
    id: "woodlands",
    name: "Woodlands Wildlife Sanctuary",
    town: "Minden",
    lat: 44.925,
    lng: -78.72,
    takes: ["mammal"],
    phone: "705-286-1133",
    website: "https://www.woodlandswildlifesanctuary.ca",
  },
  {
    id: "rideau-valley",
    name: "Rideau Valley Wildlife Sanctuary",
    town: "North Gower (near Ottawa)",
    lat: 45.128,
    lng: -75.717,
    takes: ["bird", "mammal", "reptile"],
    phone: "613-258-9480",
    website: "https://www.rideauwildlife.org",
  },
  {
    id: "salthaven",
    name: "Salthaven Wildlife Rehabilitation & Education Centre",
    town: "Mount Brydges (near London)",
    lat: 42.9,
    lng: -81.48,
    takes: ["bird", "mammal", "reptile"],
    website: "https://www.salthaven.org",
  },

  // --- British Columbia ---
  {
    id: "wildarc",
    name: "BC SPCA Wild ARC",
    town: "Victoria, BC",
    lat: 48.38,
    lng: -123.48,
    takes: ["bird", "mammal", "reptile", "amphibian"],
    website: "https://spca.bc.ca",
  },
  {
    id: "critter-care",
    name: "Critter Care Wildlife Society",
    town: "Langley, BC",
    lat: 49.1,
    lng: -122.66,
    takes: ["mammal"],
    website: "https://crittercarewildlife.org",
  },
  {
    id: "ocean-wise-marine",
    name: "Ocean Wise Marine Mammal Rescue",
    town: "Vancouver, BC",
    lat: 49.3,
    lng: -123.13,
    takes: ["mammal"],
    website: "https://ocean.org",
  },

  // --- Alberta ---
  {
    id: "aiwc",
    name: "Alberta Institute for Wildlife Conservation",
    town: "Madden, AB (near Calgary)",
    lat: 51.5,
    lng: -114.53,
    takes: ["bird", "mammal"],
    website: "https://www.aiwc.ca",
  },
  {
    id: "wildnorth",
    name: "WILDNorth",
    town: "Edmonton, AB",
    lat: 53.55,
    lng: -113.49,
    takes: ["bird", "mammal"],
    website: "https://wildnorth.ca",
  },

  // --- Saskatchewan / Manitoba ---
  {
    id: "living-sky",
    name: "Living Sky Wildlife Rehabilitation",
    town: "Saskatoon, SK",
    lat: 52.13,
    lng: -106.67,
    takes: ["bird", "mammal"],
    website: "https://livingskywildliferehabilitation.org",
  },
  {
    // Prairie Wildlife Rehabilitation Centre closed in 2026; Manitoba intake
    // now goes to Wildlife Haven Rehabilitation Centre.
    id: "wildlife-haven",
    name: "Wildlife Haven Rehabilitation Centre",
    town: "Île-des-Chênes, MB",
    lat: 49.71,
    lng: -96.99,
    takes: ["bird", "mammal"],
    phone: "204-202-3806",
  },

  // --- Quebec ---
  {
    id: "le-nichoir",
    name: "Le Nichoir Wild Bird Conservation Centre",
    town: "Hudson, QC",
    lat: 45.45,
    lng: -74.15,
    takes: ["bird"],
    website: "https://lenichoir.org",
  },

  // --- Atlantic Canada ---
  {
    id: "hope-for-wildlife",
    name: "Hope for Wildlife",
    town: "Seaforth, NS",
    lat: 44.71,
    lng: -63.36,
    takes: ["bird", "mammal", "reptile"],
    website: "https://hopeforwildlife.net",
  },
  {
    id: "cobequid",
    name: "Cobequid Wildlife Rehabilitation Centre",
    town: "Brookfield, NS",
    lat: 45.26,
    lng: -63.29,
    takes: ["bird", "mammal"],
    phone: "902-893-0253",
    website: "https://www.cwrc.net",
  },
];

export interface RankedCentre extends Centre {
  distanceKm: number;
}

const EARTH_RADIUS_KM = 6371;

/** Great-circle distance between two coordinates, in kilometres. */
export function haversineKm(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number
): number {
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return EARTH_RADIUS_KM * 2 * Math.asin(Math.sqrt(a));
}

/**
 * Centres ranked by distance from the user. When `animal` is provided (and not
 * "unsure"), centres that don't list that category are still included but sorted
 * after. A nearby generalist is often the right first call regardless.
 */
export function rankCentres(
  userLat: number,
  userLng: number,
  animal?: AnimalType,
  centres: Centre[] = ONTARIO_CENTRES
): RankedCentre[] {
  const filterAnimal = animal && animal !== "unsure" ? animal : null;

  return centres.map((c) => ({
    ...c,
    distanceKm: haversineKm(userLat, userLng, c.lat, c.lng),
  })).sort((a, b) => {
    if (filterAnimal) {
      const aTakes = a.takes.includes(filterAnimal) ? 0 : 1;
      const bTakes = b.takes.includes(filterAnimal) ? 0 : 1;
      if (aTakes !== bTakes) return aTakes - bTakes;
    }
    return a.distanceKm - b.distanceKm;
  });
}
