"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import CentreFinder from "@/components/CentreFinder";
import PhotoIdentify from "@/components/PhotoIdentify";
import ReporterContact from "@/components/ReporterContact";
import ReportStatus from "@/components/ReportStatus";
import DomesticRedirect from "@/components/DomesticRedirect";
import NearbyHelp from "@/components/NearbyHelp";
import SafetyBanner from "@/components/SafetyBanner";
import Spinner from "@/components/Spinner";
import AnimalIcon from "@/components/AnimalIcon";
import { Camera, Images, MapPin, ChevronRight, HeartPulse, Leaf } from "lucide-react";
import { flash } from "@/lib/flash";
import { detectDanger, type DangerInfo } from "@/lib/safety";
import { assessDeceased } from "@/lib/surveillance";
import type { SurveillanceResult } from "@/app/api/surveillance/route";
type DeceasedAssessment = SurveillanceResult;
import {
  ANIMAL_OPTIONS,
  SITUATIONS,
  recommend,
  type AnimalType,
  type AnimalOption,
  type Situation,
  type Recommendation,
} from "@/lib/triage";

type Step = "intro" | "animal" | "situation" | "details" | "result";
type Mode = "rescue" | "deceased";
type Result = Recommendation & { source?: "ai" | "rules" };
type AssignedCentre = {
  id: string;
  name: string;
  town: string;
  phone?: string | null;
  website?: string | null;
};
type LocStatus = "idle" | "locating" | "done" | "denied";

// The progress bar covers the input steps + result. A deceased report skips the
// "what's wrong" situation step (it's already dead), so its track is shorter.
const STEP_ORDER_RESCUE: Step[] = ["animal", "situation", "details", "result"];
const STEP_ORDER_DECEASED: Step[] = ["animal", "details", "result"];

export default function TriagePage() {
  const [step, setStep] = useState<Step>("intro");
  const [mode, setMode] = useState<Mode>("rescue");
  const [assessment, setAssessment] = useState<DeceasedAssessment | null>(null);
  const [domestic, setDomestic] = useState(false);
  const [animalOption, setAnimalOption] = useState<AnimalOption | null>(null);
  const [situation, setSituation] = useState<Situation | null>(null);
  const [description, setDescription] = useState("");
  const [photoHint, setPhotoHint] = useState("");
  const [danger, setDanger] = useState<DangerInfo | null>(null);
  const [showPhoto, setShowPhoto] = useState(false);
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [coords, setCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [locStatus, setLocStatus] = useState<LocStatus>("idle");
  const [locError, setLocError] = useState<string>("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<Result | null>(null);
  const [caseId, setCaseId] = useState<string | null>(null);
  const [trackToken, setTrackToken] = useState<string | null>(null);
  const [saveError, setSaveError] = useState(false);
  const [routingNote, setRoutingNote] = useState<string | null>(null);
  const [assignedCentre, setAssignedCentre] = useState<AssignedCentre | null>(
    null
  );
  const photoInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);

  const stepOrder = mode === "deceased" ? STEP_ORDER_DECEASED : STEP_ORDER_RESCUE;
  const stepIndex = stepOrder.indexOf(step);
  // Input steps are everything before "result"; used for the "Step N of M" label.
  const inputStepCount = stepOrder.length - 1;


  // ---- Draft persistence: an interrupted report survives a refresh. --------
  // Restores animal/situation/description/step (1-hour TTL); cleared once the
  // report reaches the result step. Photo and location are re-collected.
  useEffect(() => {
    try {
      const raw = sessionStorage.getItem("wa_triage_draft");
      if (!raw) return;
      const d = JSON.parse(raw) as {
        at: number; step?: Step; mode?: Mode; animal?: string | null;
        situation?: Situation | null; description?: string;
      };
      if (!d.at || Date.now() - d.at > 60 * 60 * 1000) return;
      const opt = d.animal
        ? ANIMAL_OPTIONS.find((o) => o.value === d.animal) ?? null
        : null;
      if (d.mode === "deceased") setMode("deceased");
      if (opt) setAnimalOption(opt);
      if (d.situation) setSituation(d.situation);
      if (d.description) setDescription(d.description);
      if (
        d.step &&
        d.step !== "result" &&
        (d.step === "intro" || d.step === "animal" || opt)
      ) {
        setStep(d.step);
      }
    } catch {
      // ignore a corrupt draft
    }
  }, []);

  useEffect(() => {
    try {
      if (step === "result") {
        sessionStorage.removeItem("wa_triage_draft");
        return;
      }
      // Nothing chosen yet (e.g. the very first render) -> nothing to save,
      // and skipping also avoids clobbering a draft before it's restored.
      if (!animalOption && !situation && !description) return;
      sessionStorage.setItem(
        "wa_triage_draft",
        JSON.stringify({
          at: Date.now(),
          step,
          mode,
          animal: animalOption?.value ?? null,
          situation,
          description,
        })
      );
    } catch {
      // storage unavailable, fine
    }
  }, [step, mode, animalOption, situation, description]);

  function reset() {
    setAnimalOption(null);
    setSituation(null);
    setDescription("");
    setPhotoHint("");
    setDanger(null);
    setShowPhoto(false);
    setPhotoFile(null);
    setPhotoPreview(null);
    setCoords(null);
    setLocStatus("idle");
    setLocError("");
    setResult(null);
    setCaseId(null);
    setTrackToken(null);
    setSaveError(false);
    setRoutingNote(null);
    setAssignedCentre(null);
    setDomestic(false);
    setMode("rescue");
    setAssessment(null);
    setStep("intro");
  }

  function onPhotoPick(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setPhotoFile(file);
    setPhotoPreview(URL.createObjectURL(file));
  }

  function useMyLocation() {
    if (!("geolocation" in navigator)) {
      setLocError("This device or browser can't share a location.");
      setLocStatus("denied");
      return;
    }
    setLocStatus("locating");
    setLocError("");

    const onOk = (pos: GeolocationPosition) => {
      setCoords({ lat: pos.coords.latitude, lng: pos.coords.longitude });
      setLocStatus("done");
    };

    // Two-stage: a quick fast attempt, then a longer high-accuracy retry.
    navigator.geolocation.getCurrentPosition(
      onOk,
      () => {
        navigator.geolocation.getCurrentPosition(
          onOk,
          (err) => {
            if (err.code === err.PERMISSION_DENIED) {
              setLocError(
                "Location permission is blocked. Enable it for this site in your browser settings, or continue without it."
              );
            } else if (err.code === err.TIMEOUT) {
              setLocError(
                "Getting your location took too long. Check that location services are on, then try again."
              );
            } else {
              setLocError(
                "We couldn't determine your location. You can still continue without it."
              );
            }
            setLocStatus("denied");
          },
          { enableHighAccuracy: true, timeout: 25000, maximumAge: 0 }
        );
      },
      { enableHighAccuracy: false, timeout: 8000, maximumAge: 300000 }
    );
  }

  function deceasedFallback(animal: AnimalType, desc: string): DeceasedAssessment {
    const det = assessDeceased(animal, desc);
    return {
      title: "",
      summary: "",
      whoHandlesRemoval:
        "For a dead animal on a public road or sidewalk, call your local municipality (usually 311). On private property, contact a licensed wildlife removal company. If this involves a disease concern, contact your regional wildlife-health authority.",
      risks: det.risks.map((r) => ({ label: r.label, why: r.why, action: r.action })),
      handling: det.handling,
      source: "rules" as const,
    };
  }

  async function submit() {
    if (!animalOption) return;
    if (mode === "rescue" && !situation) return;
    setLoading(true);
    setSaveError(false);
    const category = animalOption.category;
    const parts = [`The animal is a ${animalOption.label}.`];
    if (photoHint) parts.push(`Photo analysis suggests it may be a ${photoHint}.`);
    if (description.trim()) parts.push(description.trim());
    const fullDescription = parts.join(" ");

    // Upload the animal photo first (best-effort), shared by both flows.
    let photoUrl: string | undefined;
    if (photoFile) {
      try {
        const fd = new FormData();
        fd.append("file", photoFile);
        const r = await fetch("/api/case-photo", { method: "POST", body: fd });
        const d = await r.json();
        if (d.path) photoUrl = d.path;
      } catch {
        // keep going without the photo
      }
    }

    // Deceased report: a surveillance case, no care advice or centre routing.
    // The assessment is deterministic (lib/surveillance.ts); we just log it with
    // its health flags and location.
    if (mode === "deceased") {
      // Try the LLM-grounded surveillance API first; fall back to deterministic.
      let assess: DeceasedAssessment;
      try {
        const res = await fetch("/api/surveillance", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ animal: category, description: fullDescription }),
        });
        const data = res.ok ? await res.json() : null;
        assess = data?.title ? data : deceasedFallback(category, fullDescription);
      } catch {
        assess = deceasedFallback(category, fullDescription);
      }
      setAssessment(assess);
      // Deterministic codes for the DB (independent of LLM display result).
      const detFlags = assessDeceased(category, fullDescription).risks.map((r) => r.code);
      const caseTitle = assess.title ||
        (animalOption.value === "unsure"
          ? "Deceased animal"
          : `Deceased ${animalOption.label.toLowerCase()}`);
      try {
        const r = await fetch("/api/cases", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            animal: animalOption.label,
            category,
            situation: "found-dead",
            description: fullDescription,
            verdict: "deceased",
            title: caseTitle,
            lat: coords?.lat,
            lng: coords?.lng,
            photoUrl,
            kind: "deceased",
            surveillance: detFlags,
          }),
        });
        const d = r.ok ? await r.json() : null;
        if (d?.id) {
          setCaseId(d.id);
          if (d.trackToken) setTrackToken(d.trackToken);
        } else {
          setSaveError(true);
        }
      } catch {
        setSaveError(true);
      }
      setLoading(false);
      setStep("result");
      return;
    }

    // ---- Rescue flow (live animal) -----------------------------------------
    if (!situation) {
      setLoading(false);
      return;
    }
    // Deterministic safety check across everything we know about the animal.
    const d = danger ?? detectDanger(description, photoHint, animalOption.label);
    if (d) setDanger(d);

    // Get the care advice.
    let advice: Result;
    try {
      const res = await fetch("/api/triage", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          animal: category,
          situation,
          description: fullDescription,
        }),
      });
      if (!res.ok) throw new Error("bad response");
      advice = await res.json();
    } catch {
      advice = { ...recommend(category, situation), source: "rules" as const };
    }
    setResult(advice);

    // Log the case (with location, photo, auto-routed centre).
    try {
      const r = await fetch("/api/cases", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          animal: animalOption.label,
          category,
          situation,
          description: fullDescription,
          verdict: advice.verdict,
          title: advice.title,
          lat: coords?.lat,
          lng: coords?.lng,
          photoUrl,
        }),
      });
      const d = r.ok ? await r.json() : null;
      if (d?.id) {
        setCaseId(d.id);
        if (d.trackToken) setTrackToken(d.trackToken);
        if (d.centre) setAssignedCentre(d.centre);
        if (d.routingNote) setRoutingNote(d.routingNote);
      } else {
        setSaveError(true);
      }
    } catch {
      // The guidance still shows; we just couldn't save/route the report.
      setSaveError(true);
    }

    setLoading(false);
    setStep("result");
  }

  if (domestic) {
    return (
      <main className="mx-auto flex w-full max-w-xl flex-1 flex-col px-5 py-8">
        <DomesticRedirect onBack={() => setDomestic(false)} />
      </main>
    );
  }

  return (
    <main className="mx-auto flex w-full max-w-xl flex-1 flex-col px-5 py-8">
      {/* Progress */}
      {step !== "intro" && (
        <div className="mb-8 flex items-center gap-1.5">
          {stepOrder.map((s, i) => (
            <div
              key={s}
              className={`h-1 flex-1 rounded-full transition-colors duration-300 ${
                i <= stepIndex ? "bg-forest-900" : "bg-stone-200"
              }`}
            />
          ))}
        </div>
      )}

      {step === "intro" && (
        <Section
          key="intro"
          eyebrow="Report an animal"
          title="Is the animal alive?"
          subtitle="This tells us whether to guide a rescue or log it for wildlife-health tracking."
        >
          <div className="overflow-hidden rounded-2xl border border-stone-200 bg-white">
            <button
              onClick={() => {
                setMode("rescue");
                setStep("animal");
              }}
              className="group flex w-full items-center gap-4 px-4 py-4 text-left transition-colors hover:bg-stone-50"
            >
              <HeartPulse className="h-6 w-6 shrink-0 text-emerald-700" aria-hidden />
              <span className="min-w-0 flex-1">
                <span className="block font-medium text-stone-900">
                  It&apos;s alive but injured, sick, or in trouble
                </span>
                <span className="block text-sm leading-snug text-stone-500">
                  Get step-by-step care advice and route it to the nearest
                  wildlife centre.
                </span>
              </span>
              <ChevronRight
                aria-hidden
                className="h-4 w-4 shrink-0 text-stone-300 transition-all group-hover:translate-x-0.5 group-hover:text-stone-500"
              />
            </button>
            <button
              onClick={() => {
                setMode("deceased");
                setStep("animal");
              }}
              className="group flex w-full items-center gap-4 border-t border-stone-100 px-4 py-4 text-left transition-colors hover:bg-stone-50"
            >
              <Leaf className="h-6 w-6 shrink-0 text-stone-500" aria-hidden />
              <span className="min-w-0 flex-1">
                <span className="block font-medium text-stone-900">
                  It has died
                </span>
                <span className="block text-sm leading-snug text-stone-500">
                  Report a dead animal so it can be tracked for disease and
                  handled safely.
                </span>
              </span>
              <ChevronRight
                aria-hidden
                className="h-4 w-4 shrink-0 text-stone-300 transition-all group-hover:translate-x-0.5 group-hover:text-stone-500"
              />
            </button>
          </div>

          <p className="mt-4 border-t border-stone-100 pt-4 text-sm text-stone-500">
            Not a wild animal?{" "}
            <button
              onClick={() => setDomestic(true)}
              className="font-medium text-emerald-700 underline underline-offset-2 hover:text-emerald-700"
            >
              It&apos;s a pet, or a dog or cat
            </button>
          </p>
        </Section>
      )}

      {animalOption &&
        (step === "situation" || step === "details") && (
          <div className="mb-5 flex items-center justify-between gap-2 rounded-xl border border-stone-200 bg-stone-50 px-3.5 py-2.5">
            <span className="flex items-center gap-2 text-sm text-stone-700">
              <AnimalIcon
                name={animalOption.value}
                className="h-4 w-4 text-emerald-700"
              />
              <span className="font-medium text-stone-900">
                {animalOption.label}
              </span>
              {photoHint && (
                <span className="text-stone-500">(looks like a {photoHint})</span>
              )}
            </span>
            <button
              onClick={() => setStep("animal")}
              className="shrink-0 text-sm font-medium text-stone-500 hover:text-stone-900"
            >
              Change
            </button>
          </div>
        )}

      {step === "animal" && (
        <Section
          key="animal"
          eyebrow={`Step 1 of ${inputStepCount}`}
          title={mode === "deceased" ? "What is the animal?" : "What did you find?"}
          subtitle="Pick the closest match. It's okay to guess."
          onBack={() => setStep("intro")}
        >
          <div className="overflow-hidden rounded-2xl border border-stone-200 bg-white">
            {ANIMAL_OPTIONS.map((a, i) => (
              <button
                key={a.value}
                onClick={() => {
                  setAnimalOption(a);
                  setStep(mode === "deceased" ? "details" : "situation");
                }}
                className={`group flex w-full items-center gap-4 px-4 py-4 text-left transition-colors ${
                  i > 0 ? "border-t border-stone-100" : ""
                } ${
                  animalOption?.value === a.value
                    ? "bg-emerald-50/60"
                    : "hover:bg-stone-50"
                }`}
              >
                <AnimalIcon
                  name={a.value}
                  className="h-6 w-6 shrink-0 text-emerald-700"
                />
                <span className="min-w-0 flex-1">
                  <span className="block font-medium text-stone-900">
                    {a.label}
                  </span>
                  <span className="block text-sm leading-snug text-stone-500">
                    {a.description}
                  </span>
                </span>
                <ChevronRight
                  aria-hidden
                  className="h-4 w-4 shrink-0 text-stone-300 transition-all group-hover:translate-x-0.5 group-hover:text-stone-500"
                />
              </button>
            ))}
          </div>

          <div className="mt-2">
            {!showPhoto ? (
              <button
                onClick={() => setShowPhoto(true)}
                className="inline-flex items-center gap-1.5 text-sm font-medium text-emerald-700 hover:text-emerald-700"
              >
                <Camera className="h-4 w-4" aria-hidden />
                Not sure? Identify it with a photo
              </button>
            ) : (
              <PhotoIdentify
                onIdentify={(category, hint) => {
                  setPhotoHint(hint);
                  const d = detectDanger(hint);
                  if (d) setDanger(d);
                  const match = ANIMAL_OPTIONS.find(
                    (o) => o.category === category && o.value !== "unsure"
                  );
                  if (match) {
                    setAnimalOption(match);
                    setStep(mode === "deceased" ? "details" : "situation");
                  }
                }}
              />
            )}
          </div>

          <p className="mt-4 border-t border-stone-100 pt-4 text-sm text-stone-500">
            Not a wild animal?{" "}
            <button
              onClick={() => setDomestic(true)}
              className="font-medium text-emerald-700 underline underline-offset-2 hover:text-emerald-700"
            >
              It&apos;s a pet, or a dog or cat
            </button>
          </p>
        </Section>
      )}

      {step === "situation" && (
        <Section
          key="situation"
          eyebrow={`Step ${stepIndex + 1} of ${inputStepCount}`}
          title="What's going on with it?"
          subtitle="Choose the option that best fits what you're seeing."
          onBack={() => setStep("animal")}
        >
          <div className="overflow-hidden rounded-2xl border border-stone-200 bg-white">
            {SITUATIONS.map((s, i) => (
              <button
                key={s.value}
                onClick={() => {
                  setSituation(s.value);
                  setStep("details");
                }}
                className={`group flex w-full items-center justify-between gap-4 px-4 py-4 text-left transition-colors hover:bg-stone-50 ${
                  i > 0 ? "border-t border-stone-100" : ""
                }`}
              >
                <span className="text-stone-800">{s.label}</span>
                <ChevronRight
                  aria-hidden
                  className="h-4 w-4 shrink-0 text-stone-300 transition-all group-hover:translate-x-0.5 group-hover:text-stone-500"
                />
              </button>
            ))}
          </div>
        </Section>
      )}

      {step === "details" && (
        <Section
          key="details"
          eyebrow={`Step ${stepIndex + 1} of ${inputStepCount}`}
          title="Tell us a bit more"
          subtitle={
            mode === "deceased"
              ? "These help officials track and handle it. Everything here is optional."
              : "These help whoever responds. Everything here is optional."
          }
          onBack={() => setStep(mode === "deceased" ? "animal" : "situation")}
        >
          {/* Description */}
          <label className="flex flex-col gap-1.5">
            <span className="text-sm font-medium text-stone-700">
              Describe what you see
            </span>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="e.g. A small bird has been under a tree for an hour, hopping but not flying. There's a cat in the yard."
              rows={4}
              className="w-full resize-none rounded-xl border border-stone-200 bg-white p-4 text-stone-800 outline-none transition-colors placeholder:text-stone-500 focus:border-stone-400 focus:ring-4 focus:ring-stone-900/5"
            />
          </label>

          {/* Photo of the animal */}
          <div className="mt-4">
            <p className="text-sm font-medium text-stone-700">
              Add a photo of the animal
            </p>
            <p className="mb-2 text-xs text-stone-500">
              A photo helps responders understand its condition.
            </p>
            <input
              ref={photoInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={onPhotoPick}
            />
            <input
              ref={cameraInputRef}
              type="file"
              accept="image/*"
              capture="environment"
              className="hidden"
              onChange={onPhotoPick}
            />
            {photoPreview ? (
              <div className="flex items-center gap-3">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={photoPreview}
                  alt="The animal you photographed"
                  className="h-16 w-16 rounded-xl object-cover"
                />
                <button
                  onClick={() => cameraInputRef.current?.click()}
                  className="text-sm font-medium text-emerald-700 underline underline-offset-2 hover:text-emerald-700"
                >
                  Retake
                </button>
                <button
                  onClick={() => {
                    setPhotoFile(null);
                    setPhotoPreview(null);
                  }}
                  className="text-sm font-medium text-stone-500 underline underline-offset-2 hover:text-stone-800"
                >
                  Remove
                </button>
              </div>
            ) : (
              <div className="flex flex-wrap gap-2">
                <button
                  onClick={() => cameraInputRef.current?.click()}
                  className="inline-flex h-10 items-center justify-center gap-1.5 rounded-lg border border-stone-200 bg-white px-4 text-sm font-medium text-stone-700 transition-colors hover:bg-stone-50"
                >
                  <Camera className="h-4 w-4" aria-hidden />
                  Take photo
                </button>
                <button
                  onClick={() => photoInputRef.current?.click()}
                  className="inline-flex h-10 items-center justify-center gap-1.5 rounded-lg border border-stone-200 bg-white px-4 text-sm font-medium text-stone-700 transition-colors hover:bg-stone-50"
                >
                  <Images className="h-4 w-4" aria-hidden />
                  Choose from library
                </button>
              </div>
            )}
          </div>

          {/* Location */}
          <div className="mt-4">
            <p className="text-sm font-medium text-stone-700">
              Where is the animal?
            </p>
            <p className="mb-2 text-xs text-stone-500">
              {mode === "deceased"
                ? "Sharing the location helps track where animals are dying and flags clusters."
                : "Sharing your location routes this report and shows the closest help."}
            </p>
            {locStatus === "done" ? (
              <div
                role="status"
                aria-live="polite"
                className="flex items-center gap-2 text-sm text-stone-700"
              >
                <MapPin className="h-4 w-4 text-emerald-700" aria-hidden />
                <span className="font-medium">Location captured.</span>
                <button
                  onClick={() => {
                    setCoords(null);
                    setLocStatus("idle");
                  }}
                  className="text-stone-500 underline underline-offset-2 hover:text-stone-800"
                >
                  Clear
                </button>
              </div>
            ) : (
              <button
                onClick={useMyLocation}
                disabled={locStatus === "locating"}
                className="inline-flex h-10 items-center justify-center gap-1.5 rounded-lg border border-stone-200 bg-white px-4 text-sm font-medium text-stone-700 transition-colors hover:bg-stone-50 disabled:opacity-60"
              >
                {locStatus === "locating" ? (
                  <Spinner label="Locating…" />
                ) : (
                  <>
                    <MapPin className="h-4 w-4" aria-hidden />
                    {locStatus === "denied" ? "Try again" : "Use my location"}
                  </>
                )}
              </button>
            )}
            {locStatus === "denied" && (
              <p role="status" aria-live="polite" className="mt-2 text-xs text-amber-700">
                {locError ||
                  "Couldn't get your location. You can still continue without it."}
              </p>
            )}
          </div>

          <button
            onClick={submit}
            disabled={loading}
            className="mt-6 inline-flex h-12 items-center justify-center rounded-xl bg-forest-900 px-7 text-sm font-semibold text-white shadow-sm transition-all hover:bg-forest-800 active:scale-[0.98] disabled:opacity-60"
          >
            {loading ? (
              <Spinner label="Submitting…" />
            ) : mode === "deceased" ? (
              "Submit report"
            ) : (
              "Get help & send report"
            )}
          </button>
        </Section>
      )}

      {step === "result" && mode === "deceased" && animalOption && assessment && (
        <DeceasedResultView
          animalLabel={animalOption.label}
          assessment={assessment}
          trackToken={trackToken}
          saveError={saveError}
          coords={coords}
          onRestart={reset}
        />
      )}

      {step === "result" && mode === "rescue" && animalOption && result && (
        <ResultView
          animal={animalOption.category}
          result={result}
          caseId={caseId}
          trackToken={trackToken}
          saveError={saveError}
          routingNote={routingNote}
          assignedCentre={assignedCentre}
          coords={coords}
          danger={danger}
          onRestart={reset}
        />
      )}
    </main>
  );
}

function Section({
  eyebrow,
  title,
  subtitle,
  onBack,
  children,
}: {
  eyebrow: string;
  title: string;
  subtitle: string;
  onBack?: () => void;
  children: React.ReactNode;
}) {
  return (
    <div className="animate-in flex flex-col gap-5">
      <div>
        {onBack && (
          <button
            onClick={onBack}
            className="mb-3 inline-flex items-center gap-1 text-sm font-medium text-stone-500 transition-colors hover:text-stone-900"
          >
            <span aria-hidden>←</span> Back
          </button>
        )}
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-clay-600">
          {eyebrow}
        </p>
        <h1 className="mt-2 font-display text-3xl font-medium text-stone-900">
          {title}
        </h1>
        <p className="mt-1.5 text-stone-500">{subtitle}</p>
      </div>
      {children}
    </div>
  );
}

const VERDICT_STYLES = {
  help: {
    card: "border-rose-200 bg-rose-50",
    badge: "bg-white text-rose-700 ring-1 ring-rose-200",
    dot: "bg-rose-500",
    bar: "bg-rose-500",
    label: "Needs help",
    urgency: "High urgency",
    level: 3,
  },
  leave: {
    card: "border-emerald-200 bg-emerald-50",
    badge: "bg-white text-emerald-700 ring-1 ring-emerald-200",
    dot: "bg-emerald-500",
    bar: "bg-emerald-500",
    label: "Leave it be",
    urgency: "Low urgency",
    level: 1,
  },
  uncertain: {
    card: "border-amber-200 bg-amber-50",
    badge: "bg-white text-amber-700 ring-1 ring-amber-200",
    dot: "bg-amber-500",
    bar: "bg-amber-500",
    label: "Check first",
    urgency: "Medium urgency",
    level: 2,
  },
} as const;

function ResultView({
  animal,
  result,
  caseId,
  trackToken,
  saveError,
  routingNote,
  assignedCentre,
  coords,
  danger,
  onRestart,
}: {
  animal: AnimalType;
  result: Result;
  caseId: string | null;
  trackToken: string | null;
  saveError: boolean;
  routingNote: string | null;
  assignedCentre: AssignedCentre | null;
  coords: { lat: number; lng: number } | null;
  danger: DangerInfo | null;
  onRestart: () => void;
}) {
  const style = VERDICT_STYLES[result.verdict];

  function copyTrackLink() {
    if (!trackToken) return;
    const url = `${window.location.origin}/track/${trackToken}`;
    navigator.clipboard
      ?.writeText(url)
      .then(() => flash("Tracking link copied"))
      .catch(() => flash(url));
  }

  return (
    <div className="animate-in flex flex-col gap-5">
      {danger && <SafetyBanner danger={danger} />}
      {saveError && (
        <div
          role="alert"
          className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm leading-6 text-amber-900"
        >
          <span className="font-semibold">Your report didn&apos;t save.</span>{" "}
          The guidance below still applies. Please follow it, and contact a
          wildlife rehabilitator or vet directly using the options below.
        </div>
      )}
      <div className={`rounded-2xl border p-6 ${style.card}`}>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <span
            className={`inline-flex items-center gap-2 rounded-full px-2.5 py-1 text-xs font-semibold uppercase tracking-wide ${style.badge}`}
          >
            <span aria-hidden className={`h-1.5 w-1.5 rounded-full ${style.dot}`} />
            {style.label}
          </span>
          <span className="inline-flex items-center gap-2 text-xs font-medium text-stone-600">
            <span className="flex items-center gap-1" aria-hidden>
              {[1, 2, 3].map((n) => (
                <span
                  key={n}
                  className={`h-3.5 w-1.5 rounded-full ${
                    n <= style.level ? style.bar : "bg-stone-200"
                  }`}
                />
              ))}
            </span>
            {style.urgency}
          </span>
        </div>
        <h1 className="mt-3 font-display text-2xl font-semibold tracking-tight text-stone-900">
          {result.title}
        </h1>
        <p className="mt-2 leading-7 text-stone-700">{result.reasoning}</p>
      </div>

      {result.verdict === "help" && (
        <div className="rounded-2xl border-l-4 border-rose-400 bg-rose-50 p-4 text-sm leading-6 text-rose-900">
          <span className="font-semibold">Time-sensitive.</span>{" "}
          <span>
            Follow these steps and get it to a wildlife rehabilitator or vet as
            soon as you safely can. If it&apos;s a life-threatening emergency,
            call one right now.
          </span>
        </div>
      )}

      <div>
        <h2 className="mb-2.5 font-display text-lg font-semibold tracking-tight text-stone-900">
          What to do
        </h2>
        <ol className="flex flex-col gap-2">
          {result.steps.map((s, i) => (
            <li
              key={i}
              className="flex gap-3 rounded-xl border border-stone-200 bg-white p-3.5"
            >
              <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-lg bg-forest-900 text-xs font-semibold text-white">
                {i + 1}
              </span>
              <span className="leading-6 text-stone-700">{s}</span>
            </li>
          ))}
        </ol>
      </div>

      {trackToken && (
        <div className="rounded-2xl border border-stone-200 bg-white p-5 shadow-sm">
          <h2 className="font-display text-lg font-semibold text-stone-900">
            Follow your report
          </h2>
          <p className="mt-1 text-sm leading-6 text-stone-600">
            Check its status any time, from reported to in care. No account
            needed, just keep this link.
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            <Link
              href={`/track/${trackToken}`}
              className="inline-flex h-10 items-center justify-center rounded-xl bg-emerald-700 px-5 text-sm font-semibold text-white transition-colors hover:bg-emerald-800"
            >
              View status
            </Link>
            <button
              onClick={copyTrackLink}
              className="inline-flex h-10 items-center justify-center rounded-xl border border-stone-200 bg-white px-4 text-sm font-medium text-stone-700 transition-colors hover:bg-stone-50"
            >
              Copy link
            </button>
          </div>
        </div>
      )}

      {result.showContactCentre && (
        <>
          {assignedCentre ? (
            <>
              <ReportStatus centre={assignedCentre} />
              {routingNote && (
                <div className="rounded-2xl border border-stone-200 bg-white p-4 text-sm leading-6 text-stone-600">
                  <span className="font-medium text-stone-800">Why here:</span>{" "}
                  {routingNote}
                </div>
              )}
              {coords && (
                <NearbyHelp
                  lat={coords.lat}
                  lng={coords.lng}
                  animal={animal}
                  assignedId={assignedCentre.id}
                />
              )}
            </>
          ) : (
            <CentreFinder animal={animal} caseId={caseId} trackToken={trackToken} />
          )}
          <ReporterContact caseId={caseId} trackToken={trackToken} />
        </>
      )}

      <div className="flex flex-wrap gap-3 pt-1">
        <button
          onClick={onRestart}
          className="inline-flex h-11 items-center justify-center rounded-xl bg-forest-900 px-6 text-sm font-semibold text-white transition-colors hover:bg-forest-800"
        >
          Start over
        </button>
        <Link
          href="/"
          className="inline-flex h-11 items-center justify-center rounded-xl border border-stone-200 bg-white px-6 text-sm font-semibold text-stone-700 transition-colors hover:bg-stone-50"
        >
          Home
        </Link>
      </div>

      <p className="text-xs leading-5 text-stone-500">
        General guidance from an early prototype, not veterinary advice. When in
        doubt, always contact a licensed wildlife rehabilitator.
        {result.source === "rules" && " (Offline guidance mode.)"}
      </p>
    </div>
  );
}

function DeceasedResultView({
  animalLabel,
  assessment,
  trackToken,
  saveError,
  coords,
  onRestart,
}: {
  animalLabel: string;
  assessment: DeceasedAssessment;
  trackToken: string | null;
  saveError: boolean;
  coords: { lat: number; lng: number } | null;
  onRestart: () => void;
}) {
  const { title, summary, whoHandlesRemoval, risks, handling } = assessment;

  function copyTrackLink() {
    if (!trackToken) return;
    const url = `${window.location.origin}/track/${trackToken}`;
    navigator.clipboard
      ?.writeText(url)
      .then(() => flash("Tracking link copied"))
      .catch(() => flash(url));
  }

  return (
    <div className="animate-in flex flex-col gap-5">
      {saveError && (
        <div
          role="alert"
          className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm leading-6 text-amber-900"
        >
          <span className="font-semibold">Your report didn&apos;t save.</span>{" "}
          The guidance below still applies. Please follow it when handling or
          reporting the animal.
        </div>
      )}

      <div className="rounded-2xl border border-stone-200 bg-white p-6">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-clay-600">
          Report received
          {coords && (
            <span className="ml-2 font-normal normal-case tracking-normal text-stone-400">
              · location logged
            </span>
          )}
        </p>
        <h1 className="mt-3 font-display text-2xl font-semibold tracking-tight text-stone-900">
          {title || `Dead ${animalLabel.toLowerCase()} reported`}
        </h1>
        <p className="mt-2 leading-7 text-stone-700">
          {summary ||
            "Your report has been logged. Here is what to do to stay safe and make sure it is handled correctly."}
        </p>
      </div>

      {whoHandlesRemoval && (
        <div>
          <h2 className="mb-2.5 font-display text-lg font-semibold tracking-tight text-stone-900">
            Who handles this
          </h2>
          <div className="rounded-xl border-l-2 border-forest-900/30 bg-stone-50 p-4 text-sm leading-7 text-stone-700">
            {whoHandlesRemoval}
          </div>
        </div>
      )}

      {risks.length > 0 && (
        <div>
          <h2 className="mb-2.5 font-display text-lg font-semibold tracking-tight text-stone-900">
            Health &amp; safety flags
          </h2>
          <div className="flex flex-col gap-3">
            {risks.map((r, i) => (
              <div
                key={i}
                className="rounded-xl border-l-2 border-amber-400 bg-amber-50/60 p-4"
              >
                <p className="font-semibold text-amber-900">{r.label}</p>
                <p className="mt-1 text-sm leading-6 text-stone-700">{r.why}</p>
                <p className="mt-1.5 text-sm leading-6 text-stone-800">
                  <span className="font-medium">What to do:</span> {r.action}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}

      <div>
        <h2 className="mb-2.5 font-display text-lg font-semibold tracking-tight text-stone-900">
          Stay safe around it
        </h2>
        <ul className="flex flex-col gap-2">
          {handling.map((h, i) => (
            <li
              key={i}
              className="flex gap-3 rounded-xl border border-stone-200 bg-white p-3.5"
            >
              <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-lg bg-forest-900 text-xs font-semibold text-white">
                {i + 1}
              </span>
              <span className="leading-6 text-stone-700">{h}</span>
            </li>
          ))}
        </ul>
      </div>

      {trackToken && (
        <div className="rounded-2xl border border-stone-200 bg-white p-5 shadow-sm">
          <h2 className="font-display text-lg font-semibold text-stone-900">
            Follow your report
          </h2>
          <p className="mt-1 text-sm leading-6 text-stone-600">
            Check its status any time. No account needed, just keep this link.
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            <Link
              href={`/track/${trackToken}`}
              className="inline-flex h-10 items-center justify-center rounded-xl bg-emerald-700 px-5 text-sm font-semibold text-white transition-colors hover:bg-emerald-800"
            >
              View status
            </Link>
            <button
              onClick={copyTrackLink}
              className="inline-flex h-10 items-center justify-center rounded-xl border border-stone-200 bg-white px-4 text-sm font-medium text-stone-700 transition-colors hover:bg-stone-50"
            >
              Copy link
            </button>
          </div>
        </div>
      )}

      <div className="flex flex-wrap gap-3 pt-1">
        <button
          onClick={onRestart}
          className="inline-flex h-11 items-center justify-center rounded-xl bg-forest-900 px-6 text-sm font-semibold text-white transition-colors hover:bg-forest-800"
        >
          Report another
        </button>
        <Link
          href="/"
          className="inline-flex h-11 items-center justify-center rounded-xl border border-stone-200 bg-white px-6 text-sm font-semibold text-stone-700 transition-colors hover:bg-stone-50"
        >
          Home
        </Link>
      </div>

      <p className="text-xs leading-5 text-stone-500">
        General guidance from an early prototype. If a person or pet was bitten
        or scratched, or you think there may be a public-health risk, contact
        your local public-health or wildlife authority directly.
      </p>
    </div>
  );
}
