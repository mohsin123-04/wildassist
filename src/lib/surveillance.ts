/**
 * Deterministic wildlife-health surveillance layer for DECEASED-animal reports.
 * Like lib/safety.ts, this is NOT AI-driven: a dead animal's type + what the
 * finder describes is mapped to known public-health signals (avian flu, rabies,
 * chronic wasting disease, die-offs) with conservative, source-based guidance.
 *
 * Guidance is general and correct even when the exact species is unknown, and
 * deliberately avoids fabricated phone numbers; it names the right KIND of
 * authority (regional wildlife-health agency, public health, municipality).
 */

import type { AnimalType } from "./triage";

export type SurveillanceCode = "avian-flu" | "rabies" | "cwd" | "die-off";

export interface SurveillanceRisk {
  code: SurveillanceCode;
  /** Short headline. */
  label: string;
  /** Why this report matters. */
  why: string;
  /** What the finder should do / who looks after it. */
  action: string;
}

export interface DeceasedAssessment {
  /** Health-surveillance signals, most important first. */
  risks: SurveillanceRisk[];
  /** General carcass-handling do/don'ts (always shown). */
  handling: string[];
  /** What happens next / where it goes (always shown). */
  reporting: string[];
}

const MULTIPLE = [
  "multiple",
  "several",
  "many",
  "lots",
  "bunch",
  "dozen",
  "group of",
  "number of",
  "pile of",
  "two ",
  "three ",
  "four ",
  "five ",
];
const RABIES_WORDS = ["bat", "raccoon", "racoon", "skunk", "fox", "coyote", "wolf"];
const CWD_WORDS = ["deer", "elk", "moose", "caribou", "fawn", "stag", "doe", "buck"];

const has = (hay: string, words: string[]) => words.some((w) => hay.includes(w));

/** Map a deceased animal + the finder's description to surveillance signals. */
export function assessDeceased(
  animal: AnimalType,
  description = ""
): DeceasedAssessment {
  const hay = `${animal} ${description}`.toLowerCase();
  const risks: SurveillanceRisk[] = [];

  // Avian influenza (HPAI): any dead wild bird is worth reporting; the risk is
  // highest for waterfowl, raptors, gulls, and corvids, or when several are found.
  if (animal === "bird") {
    risks.push({
      code: "avian-flu",
      label: "Possible avian influenza (bird flu)",
      why: "Dead wild birds, especially waterfowl, raptors, gulls, and crows, can be an early sign of highly pathogenic avian influenza, which agencies actively monitor.",
      action:
        "Report it to your regional wildlife-health authority (the Canadian Wildlife Health Cooperative in Canada, or your state wildlife agency / USDA in the US). Keep poultry and pets away.",
    });
  }

  // Rabies-vector mammals.
  if (has(hay, RABIES_WORDS)) {
    risks.push({
      code: "rabies",
      label: "Rabies-vector species",
      why: "Bats, raccoons, skunks, foxes, and coyotes can carry rabies. A carcass is still a risk if it is touched, or if a person or pet had contact with it.",
      action:
        "Never handle it with bare hands. If anyone, or any pet, was bitten, scratched, or in close contact with it, contact public health right away.",
    });
  }

  // Chronic wasting disease (deer family).
  if (has(hay, CWD_WORDS)) {
    risks.push({
      code: "cwd",
      label: "Report for chronic wasting disease (CWD)",
      why: "Dead deer, elk, and moose are monitored for chronic wasting disease in many regions, particularly where road mortality is common.",
      action:
        "Report it to your provincial or state wildlife agency. They may want to sample it, so avoid handling the head or spine.",
    });
  }

  // Possible die-off (several animals at once).
  if (has(hay, MULTIPLE)) {
    risks.push({
      code: "die-off",
      label: "Possible die-off (multiple animals)",
      why: "Several dead animals in one place can signal disease, poisoning, or a contamination event that agencies will want to look into quickly.",
      action:
        "Report this as a cluster to your regional wildlife-health authority as soon as you can, and try not to disturb the site.",
    });
  }

  const handling = [
    "Do not touch it with bare hands. Use gloves, a shovel, or a bag turned inside-out, or simply leave it where it is.",
    "Keep children and pets well away from it.",
    "Wash your hands thoroughly afterwards, even if you wore gloves.",
  ];

  const reporting = risks.length
    ? [
        "If you safely can, leave the animal where it is. Officials may want to collect it for testing.",
        "Your report has been logged with its location and flagged for the right wildlife-health channel.",
      ]
    : [
        "For a dead animal on a public road or property, your local municipality (often reachable via 311) handles removal.",
        "Your report has been logged with its location to help track wildlife mortality.",
      ];

  return { risks, handling, reporting };
}
