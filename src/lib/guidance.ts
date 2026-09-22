/**
 * Vetted wildlife guidance knowledge base (the "R" in RAG).
 *
 * Each entry is a short, conservative piece of guidance the LLM is allowed to
 * ground its answer in. The model is instructed to use the entries relevant to
 * the described animal and situation and NOT to invent facts beyond them.
 *
 * Sources (paraphrased; review against the originals before relying on this for
 * real-world use, as details and contacts change seasonally):
 *  - Toronto Wildlife Centre (torontowildlifecentre.com)
 *  - Ontario SPCA (ontariospca.ca)
 *  - International Wildlife Rehabilitation Council (theiwrc.org)
 *  - Ontario Turtle Conservation Centre (ontarioturtle.ca)
 *  - Ontario Nature / Parks Canada (turtle & snake guidance)
 *
 * Scoping convention for retrieval:
 *  - animals: []  -> applies to every animal type
 *  - situations: [] -> applies to every situation
 * Species-specific entries are scoped by animal with situations: [] so they are
 * offered whenever that animal type is chosen; the model picks the right one
 * from the person's free-text description.
 */

import type { AnimalType, Situation } from "./triage";

export interface GuidanceEntry {
  id: string;
  animals: AnimalType[];
  situations: Situation[];
  text: string;
  source: string;
}

export const GUIDANCE: GuidanceEntry[] = [
  // ---- Universal first-response principles ----
  {
    id: "do-not-feed",
    animals: [],
    situations: [],
    text: "Do not offer a found wild animal any food or water. The wrong food, or feeding an animal that is cold, in shock, or injured, can kill it. Offer nothing by mouth until a licensed rehabilitator says it is safe.",
    source: "Ontario SPCA / Cornell Wildlife Hospital (needs verification).",
  },
  {
    id: "containment",
    animals: [],
    situations: [],
    text: "To contain an animal, use a smooth-sided cardboard box (not a wire cage) with air holes, lined with a soft towel. A box it cannot see out of lowers stress. Keep it warm, dark, and quiet. Gentle warmth helps: rest one side of the box on a heating pad set to low, or a towel-wrapped hot water bottle, so the animal can move away if it gets too warm.",
    source: "AWARE / Chintimini / Toronto Wildlife Centre (needs verification).",
  },
  {
    id: "minimize-stress",
    animals: [],
    situations: [],
    text: "Wild animals are not comforted by human voices or touch; these add stress that can be fatal. Keep it away from people, pets, TV, and radio, keep voices low, and do not keep checking on it. Handle it as little as possible.",
    source: "Toronto Wildlife Centre (needs verification).",
  },
  {
    id: "safety-handling",
    animals: [],
    situations: [],
    text: "Put your own safety first. Do not handle raptors (hawks, owls), herons, adult raccoons, foxes, skunks, coyotes, snapping turtles, or bats. Call a rehabilitator for advice instead. Bats and other mammals can carry rabies; never touch a bat with bare hands, and if anyone or a pet may have contacted a bat, contact public health.",
    source: "Toronto Wildlife Centre / public-health guidance (needs verification).",
  },
  {
    id: "who-to-call",
    animals: [],
    situations: [],
    text: "The safest next step is almost always to contact the nearest licensed wildlife rehabilitator and follow their advice before acting. In the Toronto area, the Toronto Wildlife Centre hotline (416-631-0662) can advise on most Ontario situations. Note the exact location where the animal was found.",
    source: "Toronto Wildlife Centre (needs verification).",
  },

  // ---- Situation-scoped ----
  {
    id: "clear-trauma",
    animals: [],
    situations: ["bleeding", "hit-by-vehicle", "cant-move"],
    text: "An animal that is bleeding, was hit by a vehicle, or cannot stand, fly, or move normally is very likely seriously injured and needs a rehabilitator. Contain it gently, keep it warm, dark, and quiet, give no food or water, and minimize handling.",
    source: "General wildlife first-response guidance (needs verification).",
  },
  {
    id: "caught-by-pet",
    animals: [],
    situations: ["caught-by-pet"],
    text: "Any animal caught by a cat or dog needs professional care even if it looks unharmed. Cat and dog saliva carries bacteria that cause fatal infections (septicaemia) in wildlife, often within a day. Treatment with antibiotics is needed quickly, ideally within a few hours. Contain it, keep handling to a minimum, and get it to a rehabilitator promptly.",
    source: "RSPCA / Corvid Isle (needs verification).",
  },
  {
    id: "entangled",
    animals: [],
    situations: ["entangled"],
    text: "For an animal tangled in fishing line, netting, or similar, do not yank it free, as this can worsen injuries. If it is safe and easy, cut the surrounding material, leaving some still attached rather than pulling embedded line out. Then contain it and contact a rehabilitator. If the animal is large or could bite, wait for expert help.",
    source: "General wildlife-rescue guidance (needs verification).",
  },
  {
    id: "cold-wet-still",
    animals: [],
    situations: ["cold-wet-still"],
    text: "An animal that is cold, wet, very weak, or unusually still is likely in shock or seriously unwell and needs urgent help. Provide gentle warmth as you contain it (a towel-wrapped hot water bottle under one side of the box), keep it quiet, offer no food or water, and contact a rehabilitator right away.",
    source: "General wildlife first-response guidance (needs verification).",
  },
  {
    id: "window-strike",
    animals: [],
    situations: ["window-strike"],
    text: "A bird that hit a window is often just stunned and may recover on its own. Gently place it in a ventilated paper bag or box it cannot see out of, kept warm, dark, and quiet, with no food or water. Predators can reach a stunned bird quickly, so keep it contained. Leave it undisturbed for about an hour; if it becomes alert it can be released outside. If it does not recover or is visibly injured, contact a rehabilitator.",
    source: "International Wildlife Rehabilitation Council (needs verification).",
  },
  {
    id: "nest-destroyed",
    animals: [],
    situations: ["nest-destroyed"],
    text: "A displaced or fallen nest can often be restored, and parents will usually keep feeding their young. If the babies appear unhurt, gather them and the nesting material into a small container and secure it as close as possible to the original spot, then watch from a distance for a couple of hours for a returning parent. If none returns, or a baby is injured or cold, contact a rehabilitator.",
    source: "Toronto Wildlife Centre (needs verification).",
  },

  // ---- Birds ----
  {
    id: "baby-bird-nestling-fledgling",
    animals: ["bird"],
    situations: [],
    text: "Baby songbirds fall into two stages. A NESTLING has few or no feathers and cannot stand, hop, or perch; it is too young to be out of the nest, so gently return it to the nest (usually very close by in a tree or bush) and watch from a distance for two hours for a parent. A FLEDGLING is fully feathered and can hop and grip; hopping on the ground with parents nearby is a normal stage, so leave it alone and only move it to nearby shelter if it is in immediate danger. Intervene only if the bird is clearly injured, cold, or the parents are confirmed dead.",
    source: "Toronto Wildlife Centre (needs verification).",
  },

  // ---- Mammals ----
  {
    id: "baby-squirrel",
    animals: ["mammal"],
    situations: [],
    text: "Baby squirrels are often not truly orphaned. A mother will retrieve her young during daylight. If the baby is uninjured, keep it warm and place it (in a shallow box with a towel and a wrapped heat source, raised off the ground away from predators) near where it was found, and give the mother up to about four hours to reclaim it. If she does not return by dusk, or the baby is injured, cold, or covered in insects, contain it and contact a rehabilitator. They need specialized formula; do not feed them.",
    source: "Ontario SPCA / Toronto Wildlife Centre (needs verification).",
  },
  {
    id: "baby-rabbit",
    animals: ["mammal"],
    situations: [],
    text: "A nest of baby rabbits in a shallow depression in the grass is normal and rarely abandoned. The mother visits only briefly, around dawn and dusk, to avoid drawing predators, so you will almost never see her. Do not assume the babies are orphaned. Leave the nest undisturbed; if you must check, lay two crossed twigs or string over it and see if they are disturbed within 24 hours. Only intervene if a baby is injured, cold, or clearly abandoned.",
    source: "Ontario SPCA (needs verification).",
  },
  {
    id: "baby-raccoon",
    animals: ["mammal"],
    situations: [],
    text: "A lone baby raccoon should not be assumed orphaned; mothers often move young one at a time and will return, usually overnight. Give the mother a chance to retrieve it before intervening. Do not handle adult raccoons, which can carry rabies. If the baby is still alone after a night, or is injured or cold, contact a rehabilitator.",
    source: "Toronto Wildlife Centre (needs verification).",
  },
  {
    id: "fawn",
    animals: ["mammal"],
    situations: [],
    text: "A fawn lying still and quiet on its own is almost always normal. The doe deliberately leaves it hidden and returns to nurse a few times a day; staying away keeps predators from finding it. Leave it where it is and check back in 24 to 48 hours. Only intervene if it is clearly injured, lying on its side, wandering and crying continuously, or covered in insects.",
    source: "Ontario SPCA (needs verification).",
  },
  {
    id: "bat",
    animals: ["mammal"],
    situations: [],
    text: "Never handle a bat with bare hands, as bats can carry rabies. If a bat is grounded, injured, or found indoors where people or pets could have contacted it, do not release it; contain the room, avoid contact, and call public health and a wildlife rehabilitator for guidance.",
    source: "Public-health / wildlife guidance (needs verification).",
  },

  // ---- Reptiles & amphibians ----
  {
    id: "turtle-injured",
    animals: ["reptile"],
    situations: [],
    text: "Injured turtles, including those hit by cars, can often be saved even with a badly cracked shell, so get it to a turtle trauma centre quickly. Place it in a ventilated container with no water. Note the exact location it was found, because turtles must be released where they came from. Snapping turtles bite and have long necks, so keep away from the head and lift with a shovel or board. In Ontario, the Ontario Turtle Conservation Centre (705-741-5000) treats injured turtles and runs a Turtle Taxi volunteer transport program.",
    source: "Ontario Turtle Conservation Centre / Ontario Nature (needs verification).",
  },
  {
    id: "turtle-crossing",
    animals: ["reptile"],
    situations: [],
    text: "An uninjured turtle crossing a road just needs help across in the direction it was already heading; do not relocate it elsewhere, as it knows its territory. Move small turtles by holding the sides of the shell. For snapping turtles, keep clear of the head and use a car mat or shovel to slide it across. Always check your own safety in traffic first.",
    source: "Parks Canada / Ontario Nature (needs verification).",
  },
  {
    id: "snake",
    animals: ["reptile"],
    situations: [],
    text: "Almost all Ontario snakes are harmless and simply want to get away; give the snake space to leave and do not try to touch or catch it. Only the Massasauga rattlesnake is venomous, and bites are extremely rare. If a snake is clearly injured, keep people and pets back and contact a wildlife rehabilitator for advice.",
    source: "Ontario Nature / Wildlife Preservation Canada (needs verification).",
  },
];

/**
 * Retrieve guidance entries relevant to the given animal/situation. Universal
 * entries (empty animals and situations) always apply; species entries apply to
 * their animal type; situation entries apply to their situation. The model then
 * selects the most relevant ones using the person's free-text description.
 */
export function retrieveGuidance(
  animal: AnimalType,
  situation: Situation
): GuidanceEntry[] {
  const matches = GUIDANCE.filter((g) => {
    const animalOk = g.animals.length === 0 || g.animals.includes(animal);
    const situationOk =
      g.situations.length === 0 || g.situations.includes(situation);
    return animalOk && situationOk;
  });

  return Array.from(new Map(matches.map((m) => [m.id, m])).values());
}
