/**
 * Vetted knowledge base for deceased-animal reports.
 *
 * Each entry is a short, factual piece of guidance grounded in public-health
 * and wildlife-agency sources. The LLM is instructed to use only these facts
 * and is NOT allowed to invent species behaviour, disease details, or contact
 * numbers beyond them.
 *
 * Sources: Canadian Wildlife Health Cooperative (CWHC), USDA Wildlife Services,
 * USDA APHIS, CDC, Government of Canada (wildlife disease surveillance),
 * Ontario Ministry of Natural Resources, BC Wildlife Act guidance,
 * Toronto Public Health, Wildlife Preservation Canada, Municipal 311 guidelines.
 * Compiled and fact-checked October 2026.
 */

export interface SurveillanceGuidanceEntry {
  id: string;
  text: string;
}

export const SURVEILLANCE_GUIDANCE: SurveillanceGuidanceEntry[] = [
  // ---- Who removes a carcass: by location ----
  {
    id: "removal-road",
    text: "A dead animal on a public road, sidewalk, or municipal property is the responsibility of the local municipality. In most Canadian and US cities, residents can report it by calling 311 or using the city's online service request portal. The municipality will send a public works crew to remove it.",
  },
  {
    id: "removal-highway",
    text: "Dead animals on provincial or state highways (not city streets) are handled by the provincial or state transportation or highways department. Contact information is usually available on the ministry or department of transportation website for that region.",
  },
  {
    id: "removal-private",
    text: "A carcass on private property is the legal responsibility of the property owner. Many municipalities offer removal services on request even for private land; otherwise, licensed private wildlife removal companies handle this. Search for a licensed wildlife removal or animal control service in your area.",
  },
  {
    id: "removal-park",
    text: "Dead animals found in a provincial or national park, conservation area, or wildlife reserve should be reported to the park office or conservation authority. Rangers or conservation officers will handle removal and may collect the animal for disease testing.",
  },

  // ---- Who deals with disease surveillance ----
  {
    id: "surveillance-cwhc",
    text: "In Canada, the Canadian Wildlife Health Cooperative (CWHC) is the primary agency for wildlife disease surveillance. They collect and test dead wild animals for diseases like avian influenza, West Nile virus, and chronic wasting disease. Suspicious deaths (multiple animals, unusual species, or known disease zones) can be reported through the CWHC regional contacts.",
  },
  {
    id: "surveillance-usda",
    text: "In the United States, USDA Wildlife Services and state wildlife agencies coordinate wildlife disease surveillance. Dead birds and mammals found in unusual numbers or in suspected disease zones can be reported to the state wildlife agency or local USDA Wildlife Services office.",
  },
  {
    id: "surveillance-publichealth",
    text: "If a person or pet has had direct contact (bite, scratch, or bare-skin touch) with a dead rabies-vector animal (bat, raccoon, skunk, fox, or coyote), this is a public health matter. Contact the local public health unit immediately. Rabies post-exposure treatment is time-sensitive.",
  },

  // ---- Avian influenza (HPAI / bird flu) ----
  {
    id: "avian-flu-risk",
    text: "Highly pathogenic avian influenza (HPAI, or bird flu) has been detected across North America and causes mass die-offs in wild birds, particularly waterfowl (ducks, geese, swans), shorebirds, gulls, raptors (hawks, eagles, owls), and corvids (crows, ravens). A single dead bird in these groups is worth reporting during active surveillance seasons (especially spring and fall migration).",
  },
  {
    id: "avian-flu-human-risk",
    text: "Human infection with HPAI from dead wild birds is rare but has occurred. Avoid direct contact with dead wild birds. If you must handle one, wear gloves and wash hands thoroughly after. Do not allow pets, especially poultry, near a dead wild bird.",
  },
  {
    id: "avian-flu-report",
    text: "Report a dead wild bird you suspect may be linked to avian flu to the CWHC (Canada) or your state wildlife agency and USDA APHIS (US). Do not discard the carcass before reporting, as agencies may want to collect it for testing.",
  },

  // ---- Rabies-vector species ----
  {
    id: "rabies-carcass-risk",
    text: "Rabies can survive in a carcass for a short time after death. Species that commonly carry rabies in North America include bats, raccoons, skunks, foxes, and coyotes. Do not handle a carcass of any of these species with bare hands.",
  },
  {
    id: "rabies-bat-special",
    text: "Bats are the leading source of human rabies deaths in North America, often from bites that go unnoticed because they are so small. Even a dead bat should not be touched with bare hands. If a bat was found in a room where someone was sleeping, or a child or pet may have touched it, contact public health immediately, even if no bite was seen.",
  },
  {
    id: "rabies-exposure",
    text: "Rabies post-exposure prophylaxis (PEP) is highly effective but must be started quickly after a potential exposure. Symptoms once they appear are almost always fatal. This is a medical urgency, not just a precaution.",
  },

  // ---- Chronic wasting disease (CWD) ----
  {
    id: "cwd-risk",
    text: "Chronic wasting disease (CWD) is a fatal prion disease of the deer family (white-tailed deer, mule deer, elk, moose, caribou). It has spread significantly across North America. A dead deer, elk, or moose should be reported to the provincial or state wildlife agency, which tracks CWD zones and may want to test the carcass.",
  },
  {
    id: "cwd-handling",
    text: "If you must handle a dead deer or elk (for example to move it off a road), avoid contact with the brain, spinal cord, lymph nodes, eyes, and spleen, as these tissues have the highest concentration of CWD prions. Wear gloves. Wash hands and any tools or clothing that contacted the carcass.",
  },
  {
    id: "cwd-human",
    text: "There is currently no confirmed case of CWD transmitting to humans, but public health agencies advise against consuming venison from CWD-positive animals. The situation is actively monitored.",
  },

  // ---- Die-offs ----
  {
    id: "die-off-reporting",
    text: "Finding multiple dead animals of the same or different species in one location is a potential die-off event. This can indicate infectious disease (such as avian flu, distemper, or West Nile virus), poisoning (pesticide misuse or intentional poisoning), or a water quality event (algal bloom, industrial spill). Report a cluster to the CWHC (Canada) or USDA Wildlife Services / state wildlife agency (US) promptly, and if possible photograph the scene without disturbing it.",
  },
  {
    id: "die-off-do-not-disturb",
    text: "If you find multiple dead animals, do not move or collect them before reporting. Agencies want to assess the scene as found. Photograph what you see (numbers, species if identifiable, the location, whether they are in water or near a water source) and report the location precisely.",
  },

  // ---- General carcass handling ----
  {
    id: "handling-gloves",
    text: "Always use gloves or a bag turned inside-out as a barrier when handling any dead wild animal. A shovel works well for moving a carcass without contact. Wash hands with soap and water after, even if gloves were worn.",
  },
  {
    id: "handling-pets",
    text: "Keep dogs and cats away from dead wild animals. Pets can pick up parasites, bacteria, or (for rabies-vector species) infectious material even from a carcass. If a pet has mouthed or rolled on a dead wild animal, wash the pet if possible and watch for signs of illness.",
  },
  {
    id: "handling-children",
    text: "Children are more likely to touch or pick up a dead animal out of curiosity. Keep children away and explain clearly that it must not be touched. If a child has touched one, wash hands immediately and contact a doctor or public health line if the animal was a bat, raccoon, skunk, or fox.",
  },

  // ---- What happens after reporting ----
  {
    id: "after-report",
    text: "After a dead wildlife report is filed, the next steps depend on the species and location. For road removal, expect a municipal crew within 1 to 3 business days. For disease surveillance reports, a wildlife health officer may contact you to collect the carcass or ask for photos. In high-risk disease zones, pickup can be faster.",
  },
];

/** Return all guidance entries as a numbered block for the LLM prompt. */
export function allSurveillanceGuidance(): string {
  return SURVEILLANCE_GUIDANCE.map((g, i) => `${i + 1}. ${g.text}`).join("\n");
}
