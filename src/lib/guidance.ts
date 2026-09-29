/**
 * Vetted wildlife guidance knowledge base (the "R" in RAG).
 *
 * Each entry is a short, conservative piece of guidance the LLM is allowed to
 * ground its answer in. The model is instructed to use the entries relevant to
 * the described animal and situation and NOT to invent facts beyond them.
 *
 * Sources (paraphrased). Claims were fact-checked in Sept 2026 against wildlife
 * authorities (Toronto Wildlife Centre, Ontario SPCA, Audubon, Tufts Wildlife
 * Clinic, Ontario Turtle Conservation Centre, Wildlife Preservation Canada, and
 * others). Independently re-verified 2026-09-29 — all 27 entries checked against
 * authoritative sources (TWC, HSUS, IWRC, Cornell Lab, CDC, OTCC, university
 * clinics, state/provincial agencies): 24 confirmed accurate; the baby-squirrel
 * (daylight-only reunion, not overnight), skunk (blanket safe-capture method),
 * and caught-by-pet (timing) entries were corrected. Still confirm details by
 * phone, as intake, contacts, and seasonal advice change:
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
    source: "Ontario SPCA / Cornell Wildlife Hospital (verified 2026-09).",
  },
  {
    id: "containment",
    animals: [],
    situations: [],
    text: "To contain an animal, use a smooth-sided cardboard box (not a wire cage) with air holes, lined with a soft towel. A box it cannot see out of lowers stress. Keep it warm, dark, and quiet. Gentle warmth helps: rest one side of the box on a heating pad set to low, or a towel-wrapped hot water bottle, so the animal can move away if it gets too warm.",
    source: "AWARE / Chintimini / Toronto Wildlife Centre (verified 2026-09).",
  },
  {
    id: "minimize-stress",
    animals: [],
    situations: [],
    text: "Wild animals are not comforted by human voices or touch; these add stress that can be fatal. Keep it away from people, pets, TV, and radio, keep voices low, and do not keep checking on it. Handle it as little as possible.",
    source: "Toronto Wildlife Centre (verified 2026-09).",
  },
  {
    id: "safety-handling",
    animals: [],
    situations: [],
    text: "Put your own safety first. Do not handle raptors (hawks, owls), herons, adult raccoons, foxes, skunks, coyotes, snapping turtles, or bats. Call a rehabilitator for advice instead. Bats and other mammals can carry rabies; never touch a bat with bare hands, and if anyone or a pet may have contacted a bat, contact public health.",
    source: "Toronto Wildlife Centre / public-health guidance (verified 2026-09).",
  },
  {
    id: "who-to-call",
    animals: [],
    situations: [],
    text: "The safest next step is almost always to contact the nearest licensed wildlife rehabilitator and follow their advice before acting. Note the exact location where the animal was found so a rehabilitator can advise or arrange transport.",
    source: "Toronto Wildlife Centre (verified 2026-09).",
  },

  // ---- Situation-scoped ----
  {
    id: "clear-trauma",
    animals: [],
    situations: ["bleeding", "hit-by-vehicle", "cant-move"],
    text: "An animal that is bleeding, was hit by a vehicle, or cannot stand, fly, or move normally is very likely seriously injured and needs a rehabilitator. Contain it gently, keep it warm, dark, and quiet, give no food or water, and minimize handling.",
    source: "General wildlife first-response guidance (verified 2026-09).",
  },
  {
    id: "caught-by-pet",
    animals: [],
    situations: ["caught-by-pet"],
    text: "Any animal caught by a cat or dog needs professional care even if it looks unharmed. A cat or dog's mouth carries bacteria (such as Pasteurella) that can cause rapidly fatal infections (septicaemia) in wildlife. Antibiotics are needed as soon as possible, so contain it, keep handling to a minimum, and get it to a rehabilitator promptly.",
    source: "RSPCA / Cornell Wildlife Health Lab / HSUS (re-verified 2026-09-29; timing softened to 'as soon as possible').",
  },
  {
    id: "entangled",
    animals: [],
    situations: ["entangled"],
    text: "For an animal tangled in fishing line, netting, or similar, do not yank it free, as this can worsen injuries. If it is safe and easy, cut the surrounding material, leaving some still attached rather than pulling embedded line out. Then contain it and contact a rehabilitator. If the animal is large or could bite, wait for expert help.",
    source: "General wildlife-rescue guidance (verified 2026-09).",
  },
  {
    id: "cold-wet-still",
    animals: [],
    situations: ["cold-wet-still"],
    text: "An animal that is cold, wet, very weak, or unusually still is likely in shock or seriously unwell and needs urgent help. Provide gentle warmth as you contain it (a towel-wrapped hot water bottle under one side of the box), keep it quiet, offer no food or water, and contact a rehabilitator right away.",
    source: "General wildlife first-response guidance (verified 2026-09).",
  },
  {
    id: "window-strike",
    animals: [],
    situations: ["window-strike"],
    text: "A bird that hit a window is often just stunned and may recover on its own. Gently place it in a ventilated paper bag or box it cannot see out of, kept warm, dark, and quiet, with no food or water. Predators can reach a stunned bird quickly, so keep it contained. Leave it undisturbed for about an hour; if it becomes alert it can be released outside. If it does not recover or is visibly injured, contact a rehabilitator.",
    source: "International Wildlife Rehabilitation Council (verified 2026-09).",
  },
  {
    id: "nest-destroyed",
    animals: [],
    situations: ["nest-destroyed"],
    text: "A displaced or fallen nest can often be restored, and parents will usually keep feeding their young. If the babies appear unhurt, gather them and the nesting material into a small container and secure it as close as possible to the original spot, then watch from a distance for about an hour for a returning parent. If none returns, or a baby is injured or cold, contact a rehabilitator.",
    source: "Toronto Wildlife Centre (verified 2026-09).",
  },

  // ---- Birds ----
  {
    id: "baby-bird-nestling-fledgling",
    animals: ["bird"],
    situations: [],
    text: "Baby songbirds fall into two stages. A NESTLING has few or no feathers and cannot stand, hop, or perch; it is too young to be out of the nest, so gently return it to the nest (usually very close by in a tree or bush) and watch from a distance to confirm a parent comes back. Handling it will not make the parents reject it. A FLEDGLING is fully feathered and can hop and grip; hopping on the ground with parents nearby is a normal stage, so leave it alone and only move it to nearby shelter if it is in immediate danger. Intervene only if the bird is clearly injured, cold, or the parents are confirmed dead.",
    source: "Toronto Wildlife Centre (verified 2026-09).",
  },
  {
    id: "waterfowl",
    animals: ["bird"],
    situations: [],
    text: "Ducklings and goslings follow their parents closely; if you see them with an adult, do not separate them, and never take a single duckling from its family. Adult geese can be aggressive, especially near young, so keep your distance. Waterfowl often get tangled in fishing line or hooks; if so, do not pull the line out, and contact a rehabilitator. A duckling truly alone with no parent in sight for a long time may need help.",
    source: "Wildlife-rehabilitation guidance (verified 2026-09).",
  },
  {
    id: "raptor",
    animals: ["bird"],
    situations: [],
    text: "Do not handle hawks, owls, falcons, or eagles; their talons and beaks can cause serious injury, and they need experienced handling. If a bird of prey is grounded or injured, keep people and pets away, and if it is safe you can drape a towel or box over it to keep it calm while you call a rehabilitator. Note the exact location and contact a licensed rehabilitator right away.",
    source: "Wildlife-rehabilitation guidance (verified 2026-09).",
  },

  // ---- Mammals ----
  {
    id: "baby-squirrel",
    animals: ["mammal"],
    situations: [],
    text: "Baby squirrels are often not truly orphaned. A mother will retrieve her young during daylight, usually within a few hours. If the baby is uninjured, keep it warm and place it in a shallow box with a towel and a wrapped heat source at the base of the tree where it was found, close to where it fell. Squirrels do not search after dark, so never leave a baby outside overnight. If the mother has not returned by dusk (roughly five to six hours), bring the box indoors overnight with the heat source and put it back out the next morning to give her a full day. If she still has not returned, or the baby is injured, cold, or covered in insects, contain it and contact a rehabilitator. They need specialized formula; do not feed them.",
    source: "Toronto Wildlife Centre / Greenwood Wildlife (re-verified 2026-09-29; corrected to daylight-only reunion, not overnight).",
  },
  {
    id: "baby-rabbit",
    animals: ["mammal"],
    situations: [],
    text: "A nest of baby rabbits in a shallow depression in the grass is normal and rarely abandoned. The mother visits only briefly, around dawn and dusk, to avoid drawing predators, so you will almost never see her. Do not assume the babies are orphaned. Leave the nest undisturbed; if you must check, lay two crossed twigs or string over it and look again after about 18 to 24 hours (spanning two overnight feedings) to see if they have been disturbed. A young rabbit that is fully furred with open eyes and upright ears, roughly the size of a tennis ball, is already independent and should be left alone. Only intervene if a baby is injured, cold, or clearly abandoned.",
    source: "Ontario SPCA (verified 2026-09).",
  },
  {
    id: "baby-raccoon",
    animals: ["mammal"],
    situations: [],
    text: "A lone baby raccoon should not be assumed orphaned; mothers often move young one at a time and will return, usually overnight. Give the mother a chance to retrieve it before intervening. Do not handle adult raccoons, which can carry rabies. If the baby is still alone after a night, or is injured or cold, contact a rehabilitator.",
    source: "Toronto Wildlife Centre (verified 2026-09).",
  },
  {
    id: "fawn",
    animals: ["mammal"],
    situations: [],
    text: "A fawn lying still and quiet on its own is almost always normal. The doe deliberately leaves it hidden and returns to nurse a few times a day; staying away keeps predators from finding it. Leave it where it is and check back within about 24 hours. Only intervene if it is clearly injured, lying on its side, wandering and crying continuously, or covered in insects.",
    source: "Ontario SPCA (verified 2026-09).",
  },
  {
    id: "bat",
    animals: ["mammal"],
    situations: [],
    text: "Never handle a bat with bare hands, as bats can carry rabies. If a bat is grounded, injured, or found indoors where people or pets could have contacted it, do not release it; contain the room, avoid contact, and call public health and a wildlife rehabilitator for guidance.",
    source: "Public-health / wildlife guidance (verified 2026-09).",
  },
  {
    id: "opossum",
    animals: ["mammal"],
    situations: [],
    text: "Opossums are gentle and rarely a threat; a still or open-mouthed opossum is often just 'playing dead' from fear, not injured. Leave an uninjured adult alone. If an opossum has been hit by a car or killed, check the pouch, because live babies may be inside and will need a rehabilitator. A young opossum is independent once it is about 7 to 9 inches long in the body (not counting the tail); a smaller one on its own needs help. Do not offer food or water, and avoid handling.",
    source: "Wildlife-rehabilitation guidance (verified 2026-09).",
  },
  {
    id: "skunk",
    animals: ["mammal"],
    situations: [],
    text: "Keep your distance from skunks, which can spray and may carry rabies. A common emergency is a skunk with its head stuck in a container (like a cup or jar), which can suffocate it, so act promptly — but call a wildlife rehabilitator first for guidance. If none is available and you can act safely, the recommended method is to gently drape a blanket over the skunk so it cannot raise its tail to spray, then slowly pull the container off and step back; wear gloves and eye protection. Never corner or chase a skunk. For any injured skunk, contact a rehabilitator rather than handling it.",
    source: "MSPCA / WildCare (re-verified 2026-09-29; added the blanket safe-capture method).",
  },
  {
    id: "fox-coyote",
    animals: ["mammal"],
    situations: [],
    text: "Never handle a fox or coyote; keep people and pets well back and call a wildlife rehabilitator or animal control. An animal with severe hair loss and crusty skin likely has mange, which rehabilitators can treat. A pup alone is not necessarily orphaned, as parents leave young while hunting. Report injured or clearly sick animals rather than approaching them.",
    source: "Wildlife-rehabilitation guidance (verified 2026-09).",
  },

  // ---- Reptiles & amphibians ----
  {
    id: "turtle-injured",
    animals: ["reptile"],
    situations: [],
    text: "Injured turtles, including those hit by cars, can often be saved even with a badly cracked shell, so get it to a wildlife centre or turtle trauma centre quickly. Place it in a ventilated container with no water. Note the exact location it was found, because turtles must be released where they came from. Snapping turtles bite and have long necks, so keep away from the head and lift from the rear of the shell or with a shovel or board. Some regions have dedicated turtle hospitals and volunteer transport programs, so ask the nearest rehabilitator.",
    source: "Ontario Turtle Conservation Centre / Ontario Nature (verified 2026-09).",
  },
  {
    id: "turtle-crossing",
    animals: ["reptile"],
    situations: [],
    text: "An uninjured turtle crossing a road just needs help across in the direction it was already heading; do not relocate it elsewhere, as it knows its territory. Move small turtles by holding the sides of the shell, and never lift a turtle by its tail, which can dislocate its spine. For snapping turtles, keep clear of the head and use a car mat or shovel to slide it across. Always check your own safety in traffic first.",
    source: "Parks Canada / Ontario Nature (verified 2026-09).",
  },
  {
    id: "snake",
    animals: ["reptile"],
    situations: [],
    text: "Almost all snakes in North America are harmless and simply want to get away; give the snake space to leave and do not try to touch or catch it. Some species are venomous, including rattlesnakes (across much of the US and parts of western Canada), copperheads and cottonmouths (eastern and southern US), coral snakes (southern US), and the Massasauga rattlesnake (parts of the Great Lakes region). They can be hard to identify, so never handle a snake you are unsure about, and keep children and pets away. If a snake is clearly injured, keep people and pets back and contact a wildlife rehabilitator for advice.",
    source: "Ontario Nature / Wildlife Preservation Canada / US state wildlife agencies (verified 2026-09).",
  },
  {
    id: "frog-toad",
    animals: ["amphibian"],
    situations: [],
    text: "Most frogs, toads, and salamanders found in yards are healthy and do not need help; leave them be and let them move on. Their skin is delicate and absorbs chemicals easily, so if you must move one out of danger, do it gently with clean, wet, unscented hands and place it in nearby damp cover rather than relocating it far away. Only intervene if it is clearly injured, and contact a rehabilitator for advice.",
    source: "Amphibian-handling guidance (verified 2026-09).",
  },

  // ---- Fish ----
  {
    id: "fish",
    animals: ["fish"],
    situations: [],
    text: "Wildlife rehabilitators generally do not treat fish, and a fish out of water for more than a short time usually cannot be saved. If you find a fish stranded but still lively (for example, washed onto a bank), you can gently return it to the water it came from with wet hands. For a fish tangled in line or hooks, handle it as little as possible. Report large numbers of dead or dying fish (a fish kill) or pollution to your local conservation authority or the provincial natural resources ministry rather than a wildlife centre.",
    source: "General fish / conservation-authority guidance (verified 2026-09).",
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
