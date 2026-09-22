"use client";

import Link from "next/link";
import { useState } from "react";
import CentreFinder from "@/components/CentreFinder";
import PhotoIdentify from "@/components/PhotoIdentify";
import Spinner from "@/components/Spinner";
import {
  ANIMAL_TYPES,
  SITUATIONS,
  recommend,
  type AnimalType,
  type Situation,
  type Recommendation,
} from "@/lib/triage";

type Step = "animal" | "situation" | "details" | "result";
type Result = Recommendation & { source?: "ai" | "rules" };

const STEP_ORDER: Step[] = ["animal", "situation", "details", "result"];

export default function TriagePage() {
  const [step, setStep] = useState<Step>("animal");
  const [animal, setAnimal] = useState<AnimalType | null>(null);
  const [situation, setSituation] = useState<Situation | null>(null);
  const [description, setDescription] = useState("");
  const [photoHint, setPhotoHint] = useState("");
  const [showPhoto, setShowPhoto] = useState(false);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<Result | null>(null);

  const stepIndex = STEP_ORDER.indexOf(step);

  function reset() {
    setAnimal(null);
    setSituation(null);
    setDescription("");
    setPhotoHint("");
    setShowPhoto(false);
    setResult(null);
    setStep("animal");
  }

  async function submit() {
    if (!animal || !situation) return;
    setLoading(true);
    const fullDescription = photoHint
      ? `Photo analysis suggests it may be a ${photoHint}. ${description}`.trim()
      : description;
    try {
      const res = await fetch("/api/triage", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ animal, situation, description: fullDescription }),
      });
      if (!res.ok) throw new Error("bad response");
      setResult(await res.json());
    } catch {
      setResult({ ...recommend(animal, situation), source: "rules" });
    } finally {
      setLoading(false);
      setStep("result");
    }
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

      {step === "animal" && (
        <Section
          key="animal"
          eyebrow="Step 1 of 3"
          title="What did you find?"
          subtitle="A rough idea is fine — pick the closest match."
        >
          <div className="grid grid-cols-2 gap-3">
            {ANIMAL_TYPES.map((a) => (
              <button
                key={a.value}
                onClick={() => {
                  setAnimal(a.value);
                  setStep("situation");
                }}
                className={`group flex flex-col items-start gap-2 rounded-2xl border bg-white p-4 text-left shadow-sm transition-all hover:-translate-y-0.5 hover:border-emerald-400 hover:shadow-md ${
                  animal === a.value
                    ? "border-emerald-500 ring-2 ring-emerald-500/30"
                    : "border-black/5"
                }`}
              >
                <span aria-hidden className="text-3xl">
                  {a.icon}
                </span>
                <span className="font-medium text-emerald-950">{a.label}</span>
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
                onIdentify={(detected, hint) => {
                  setPhotoHint(hint);
                  if (detected) setAnimal(detected);
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
          subtitle="In your own words — the more detail, the better the guidance. Optional."
          onBack={() => setStep("situation")}
        >
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="e.g. A small bird has been under a tree for an hour, hopping but not flying. There's a cat in the yard."
            rows={5}
            className="w-full resize-none rounded-2xl border border-black/10 bg-white p-4 text-zinc-800 shadow-sm outline-none transition-colors placeholder:text-zinc-400 focus:border-emerald-400 focus:ring-2 focus:ring-emerald-500/20"
          />
          <button
            onClick={submit}
            disabled={loading}
            className="mt-4 inline-flex h-13 items-center justify-center rounded-full bg-emerald-700 px-8 py-3.5 font-medium text-white shadow-lg shadow-emerald-700/20 transition-all hover:bg-emerald-800 active:scale-[0.98] disabled:opacity-60"
          >
            {loading ? <Spinner label="Thinking…" /> : "Get advice"}
          </button>
        </Section>
      )}

      {step === "result" && animal && result && (
        <ResultView animal={animal} result={result} onRestart={reset} />
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
    badge: "bg-rose-600",
    label: "Needs help",
    icon: "🚑",
  },
  leave: {
    card: "border-emerald-200 bg-emerald-50",
    badge: "bg-emerald-600",
    label: "Leave it be",
    icon: "🌿",
  },
  uncertain: {
    card: "border-amber-200 bg-amber-50",
    badge: "bg-amber-600",
    label: "Check first",
    icon: "👀",
  },
} as const;

function ResultView({
  animal,
  result,
  onRestart,
}: {
  animal: AnimalType;
  result: Result;
  onRestart: () => void;
}) {
  const style = VERDICT_STYLES[result.verdict];

  return (
    <div className="animate-in flex flex-col gap-5">
      <div className={`rounded-3xl border p-6 ${style.card}`}>
        <div className="flex items-center gap-2">
          <span
            className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold text-white ${style.badge}`}
          >
            <span aria-hidden>{style.icon}</span>
            {style.label}
          </span>
        </div>
        <h1 className="mt-3 font-display text-2xl font-semibold tracking-tight text-zinc-900">
          {result.title}
        </h1>
        <p className="mt-2 leading-7 text-zinc-700">{result.reasoning}</p>
      </div>

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

      {result.showContactCentre && <CentreFinder animal={animal} />}

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
