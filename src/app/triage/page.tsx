"use client";

import Link from "next/link";
import { useRef, useState } from "react";
import CentreFinder from "@/components/CentreFinder";
import PhotoIdentify from "@/components/PhotoIdentify";
import ReporterContact from "@/components/ReporterContact";
import ReportStatus from "@/components/ReportStatus";
import SafetyBanner from "@/components/SafetyBanner";
import Spinner from "@/components/Spinner";
import AnimalIcon from "@/components/AnimalIcon";
import { detectDanger, type DangerInfo } from "@/lib/safety";
import {
  ANIMAL_OPTIONS,
  SITUATIONS,
  recommend,
  type AnimalType,
  type AnimalOption,
  type Situation,
  type Recommendation,
} from "@/lib/triage";

type Step = "animal" | "situation" | "details" | "result";
type Result = Recommendation & { source?: "ai" | "rules" };
type AssignedCentre = {
  id: string;
  name: string;
  town: string;
  phone?: string | null;
  website?: string | null;
};
type LocStatus = "idle" | "locating" | "done" | "denied";

const STEP_ORDER: Step[] = ["animal", "situation", "details", "result"];

export default function TriagePage() {
  const [step, setStep] = useState<Step>("animal");
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
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<Result | null>(null);
  const [caseId, setCaseId] = useState<string | null>(null);
  const [assignedCentre, setAssignedCentre] = useState<AssignedCentre | null>(
    null
  );
  const photoInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);

  const stepIndex = STEP_ORDER.indexOf(step);

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
    setResult(null);
    setCaseId(null);
    setAssignedCentre(null);
    setStep("animal");
  }

  function onPhotoPick(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setPhotoFile(file);
    setPhotoPreview(URL.createObjectURL(file));
  }

  function useMyLocation() {
    if (!("geolocation" in navigator)) {
      setLocStatus("denied");
      return;
    }
    setLocStatus("locating");
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setCoords({ lat: pos.coords.latitude, lng: pos.coords.longitude });
        setLocStatus("done");
      },
      () => setLocStatus("denied"),
      { enableHighAccuracy: false, timeout: 10000, maximumAge: 60000 }
    );
  }

  async function submit() {
    if (!animalOption || !situation) return;
    setLoading(true);
    const category = animalOption.category;
    const parts = [`The animal is a ${animalOption.label}.`];
    if (photoHint) parts.push(`Photo analysis suggests it may be a ${photoHint}.`);
    if (description.trim()) parts.push(description.trim());
    const fullDescription = parts.join(" ");

    // Deterministic safety check across everything we know about the animal.
    const d = danger ?? detectDanger(description, photoHint, animalOption.label);
    if (d) setDanger(d);

    // Upload the animal photo first (best-effort).
    let photoUrl: string | undefined;
    if (photoFile) {
      try {
        const fd = new FormData();
        fd.append("file", photoFile);
        const r = await fetch("/api/case-photo", { method: "POST", body: fd });
        const d = await r.json();
        if (d.url) photoUrl = d.url;
      } catch {
        // keep going without the photo
      }
    }

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
      const d = await r.json();
      if (d.id) setCaseId(d.id);
      if (d.centre) setAssignedCentre(d.centre);
    } catch {
      // best-effort
    }

    setLoading(false);
    setStep("result");
  }

  return (
    <main className="mx-auto flex w-full max-w-xl flex-1 flex-col px-5 py-8">
      {/* Progress */}
      <div className="mb-8 flex items-center gap-1.5">
        {STEP_ORDER.map((s, i) => (
          <div
            key={s}
            className={`h-1.5 flex-1 rounded-full transition-colors duration-300 ${
              i <= stepIndex ? "bg-emerald-600" : "bg-emerald-600/15"
            }`}
          />
        ))}
      </div>

      {animalOption &&
        (step === "situation" || step === "details") && (
          <div className="mb-5 flex items-center justify-between gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-3.5 py-2.5">
            <span className="flex items-center gap-2 text-sm text-emerald-900">
              <AnimalIcon
                name={animalOption.value}
                className="h-4 w-4 text-emerald-700"
              />
              <span className="font-medium">{animalOption.label}</span>
              {photoHint && (
                <span className="text-emerald-700">
                  (looks like a {photoHint})
                </span>
              )}
            </span>
            <button
              onClick={() => setStep("animal")}
              className="shrink-0 text-sm font-medium text-emerald-700 underline underline-offset-2 hover:text-emerald-900"
            >
              Change
            </button>
          </div>
        )}

      {step === "animal" && (
        <Section
          key="animal"
          eyebrow="Step 1 of 3"
          title="What did you find?"
          subtitle="Pick the closest match. It's okay to guess."
        >
          <div className="grid grid-cols-2 gap-3">
            {ANIMAL_OPTIONS.map((a) => (
              <button
                key={a.value}
                onClick={() => {
                  setAnimalOption(a);
                  setStep("situation");
                }}
                className={`group flex flex-col items-start gap-2 rounded-2xl border bg-white p-4 text-left shadow-sm transition-all hover:-translate-y-0.5 hover:border-emerald-400 hover:shadow-md ${
                  animalOption?.value === a.value
                    ? "border-emerald-500 ring-2 ring-emerald-500/30"
                    : "border-black/5"
                }`}
              >
                <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-emerald-50 text-emerald-700 transition-colors group-hover:bg-emerald-100">
                  <AnimalIcon name={a.value} className="h-6 w-6" />
                </span>
                <span className="font-medium text-emerald-950">{a.label}</span>
                <span className="text-xs leading-snug text-zinc-500">
                  {a.description}
                </span>
              </button>
            ))}
          </div>

          <div className="mt-2">
            {!showPhoto ? (
              <button
                onClick={() => setShowPhoto(true)}
                className="inline-flex items-center gap-1.5 text-sm font-medium text-emerald-700 hover:text-emerald-900"
              >
                📷 Not sure? Identify it with a photo
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
                    setStep("situation");
                  }
                }}
              />
            )}
          </div>
        </Section>
      )}

      {step === "situation" && (
        <Section
          key="situation"
          eyebrow="Step 2 of 3"
          title="What's going on with it?"
          subtitle="Choose the option that best fits what you're seeing."
          onBack={() => setStep("animal")}
        >
          <div className="flex flex-col gap-2.5">
            {SITUATIONS.map((s) => (
              <button
                key={s.value}
                onClick={() => {
                  setSituation(s.value);
                  setStep("details");
                }}
                className="group flex items-center justify-between rounded-2xl border border-black/5 bg-white px-4 py-3.5 text-left shadow-sm transition-all hover:border-emerald-400 hover:shadow-md"
              >
                <span className="text-emerald-950">{s.label}</span>
                <span
                  aria-hidden
                  className="text-emerald-400 transition-transform group-hover:translate-x-0.5"
                >
                  →
                </span>
              </button>
            ))}
          </div>
        </Section>
      )}

      {step === "details" && (
        <Section
          key="details"
          eyebrow="Step 3 of 3"
          title="Tell us a bit more"
          subtitle="These help the centre respond. Everything here is optional."
          onBack={() => setStep("situation")}
        >
          {/* Description */}
          <label className="flex flex-col gap-1.5">
            <span className="text-sm font-medium text-zinc-700">
              Describe what you see
            </span>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="e.g. A small bird has been under a tree for an hour, hopping but not flying. There's a cat in the yard."
              rows={4}
              className="w-full resize-none rounded-2xl border border-black/10 bg-white p-4 text-zinc-800 shadow-sm outline-none transition-colors placeholder:text-zinc-400 focus:border-emerald-400 focus:ring-2 focus:ring-emerald-500/20"
            />
          </label>

          {/* Photo of the animal */}
          <div className="mt-4">
            <p className="text-sm font-medium text-zinc-700">
              Add a photo of the animal
            </p>
            <p className="mb-2 text-xs text-zinc-500">
              A photo helps the centre understand its condition.
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
                  onClick={() => {
                    setPhotoFile(null);
                    setPhotoPreview(null);
                  }}
                  className="text-sm font-medium text-zinc-500 underline underline-offset-2 hover:text-zinc-800"
                >
                  Remove
                </button>
              </div>
            ) : (
              <div className="flex flex-wrap gap-2">
                <button
                  onClick={() => cameraInputRef.current?.click()}
                  className="inline-flex h-11 items-center justify-center rounded-full border border-black/10 bg-white px-5 text-sm font-medium text-emerald-800 transition-colors hover:bg-emerald-50"
                >
                  📷 Take photo
                </button>
                <button
                  onClick={() => photoInputRef.current?.click()}
                  className="inline-flex h-11 items-center justify-center rounded-full border border-black/10 bg-white px-5 text-sm font-medium text-emerald-800 transition-colors hover:bg-emerald-50"
                >
                  🖼️ Choose from library
                </button>
              </div>
            )}
          </div>

          {/* Location */}
          <div className="mt-4">
            <p className="text-sm font-medium text-zinc-700">
              Where is the animal?
            </p>
            <p className="mb-2 text-xs text-zinc-500">
              Sharing your location routes this report to the nearest centre.
            </p>
            {locStatus === "done" ? (
              <div className="flex items-center gap-2 text-sm text-emerald-800">
                <span aria-hidden>📍</span>
                <span className="font-medium">Location captured.</span>
                <button
                  onClick={() => {
                    setCoords(null);
                    setLocStatus("idle");
                  }}
                  className="text-zinc-500 underline underline-offset-2 hover:text-zinc-800"
                >
                  Clear
                </button>
              </div>
            ) : (
              <button
                onClick={useMyLocation}
                disabled={locStatus === "locating"}
                className="inline-flex h-11 items-center justify-center rounded-full border border-black/10 bg-white px-5 text-sm font-medium text-emerald-800 transition-colors hover:bg-emerald-50 disabled:opacity-60"
              >
                {locStatus === "locating" ? (
                  <Spinner label="Locating…" />
                ) : (
                  "📍 Use my location"
                )}
              </button>
            )}
            {locStatus === "denied" && (
              <p className="mt-2 text-xs text-amber-700">
                Couldn&apos;t get your location. You can still continue, but the
                report won&apos;t be routed automatically.
              </p>
            )}
          </div>

          <button
            onClick={submit}
            disabled={loading}
            className="mt-6 inline-flex h-13 items-center justify-center rounded-full bg-emerald-700 px-8 py-3.5 font-medium text-white shadow-lg shadow-emerald-700/20 transition-all hover:bg-emerald-800 active:scale-[0.98] disabled:opacity-60"
          >
            {loading ? <Spinner label="Submitting…" /> : "Get help & send report"}
          </button>
        </Section>
      )}

      {step === "result" && animalOption && result && (
        <ResultView
          animal={animalOption.category}
          result={result}
          caseId={caseId}
          assignedCentre={assignedCentre}
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
        <p className="text-xs font-semibold uppercase tracking-wide text-emerald-600">
          {eyebrow}
        </p>
        <h1 className="mt-1 font-display text-2xl font-semibold tracking-tight text-emerald-950">
          {title}
        </h1>
        <p className="mt-1 text-zinc-600">{subtitle}</p>
      </div>
      {children}
      {onBack && (
        <button
          onClick={onBack}
          className="mt-1 self-start text-sm text-zinc-500 transition-colors hover:text-zinc-800"
        >
          ← Back
        </button>
      )}
    </div>
  );
}

const VERDICT_STYLES = {
  help: {
    card: "border-rose-200 bg-rose-50",
    badge: "bg-white text-rose-700 ring-1 ring-rose-200",
    dot: "bg-rose-500",
    label: "Needs help",
  },
  leave: {
    card: "border-emerald-200 bg-emerald-50",
    badge: "bg-white text-emerald-700 ring-1 ring-emerald-200",
    dot: "bg-emerald-500",
    label: "Leave it be",
  },
  uncertain: {
    card: "border-amber-200 bg-amber-50",
    badge: "bg-white text-amber-700 ring-1 ring-amber-200",
    dot: "bg-amber-500",
    label: "Check first",
  },
} as const;

function ResultView({
  animal,
  result,
  caseId,
  assignedCentre,
  danger,
  onRestart,
}: {
  animal: AnimalType;
  result: Result;
  caseId: string | null;
  assignedCentre: AssignedCentre | null;
  danger: DangerInfo | null;
  onRestart: () => void;
}) {
  const style = VERDICT_STYLES[result.verdict];

  return (
    <div className="animate-in flex flex-col gap-5">
      {danger && <SafetyBanner danger={danger} />}
      <div className={`rounded-3xl border p-6 ${style.card}`}>
        <span
          className={`inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-wide ${style.badge}`}
        >
          <span aria-hidden className={`h-2 w-2 rounded-full ${style.dot}`} />
          {style.label}
        </span>
        <h1 className="mt-3 font-display text-2xl font-semibold tracking-tight text-zinc-900">
          {result.title}
        </h1>
        <p className="mt-2 leading-7 text-zinc-700">{result.reasoning}</p>
      </div>

      {result.verdict === "help" && (
        <div className="rounded-2xl border-l-4 border-rose-400 bg-rose-50 p-4 text-sm leading-6 text-rose-900">
          <span className="font-semibold">Time-sensitive.</span>{" "}
          <span>
            Follow these steps and get it to a centre as soon as you safely can.
            If it&apos;s a life-threatening
            emergency, call a centre right now.
          </span>
        </div>
      )}

      <div>
        <h2 className="mb-2.5 font-display text-lg font-semibold text-emerald-950">
          What to do
        </h2>
        <ol className="flex flex-col gap-2.5">
          {result.steps.map((s, i) => (
            <li
              key={i}
              className="flex gap-3 rounded-2xl border border-black/5 bg-white p-3.5 shadow-sm"
            >
              <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-emerald-100 text-sm font-semibold text-emerald-800">
                {i + 1}
              </span>
              <span className="leading-6 text-zinc-700">{s}</span>
            </li>
          ))}
        </ol>
      </div>

      {result.showContactCentre && (
        <>
          {assignedCentre ? (
            <ReportStatus centre={assignedCentre} />
          ) : (
            <CentreFinder animal={animal} caseId={caseId} />
          )}
          <ReporterContact caseId={caseId} />
        </>
      )}

      <div className="flex flex-wrap gap-3 pt-1">
        <button
          onClick={onRestart}
          className="inline-flex h-11 items-center justify-center rounded-full bg-emerald-700 px-6 font-medium text-white transition-colors hover:bg-emerald-800"
        >
          Start over
        </button>
        <Link
          href="/"
          className="inline-flex h-11 items-center justify-center rounded-full border border-black/10 bg-white px-6 font-medium text-zinc-700 transition-colors hover:bg-black/5"
        >
          Home
        </Link>
      </div>

      <p className="text-xs leading-5 text-zinc-400">
        General guidance from an early prototype, not veterinary advice. When in
        doubt, always contact a licensed wildlife rehabilitator.
        {result.source === "rules" && " (Offline guidance mode.)"}
      </p>
    </div>
  );
}
