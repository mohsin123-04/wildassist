"use client";

import Link from "next/link";
import { useState } from "react";
import CentreFinder from "@/components/CentreFinder";
import PhotoIdentify from "@/components/PhotoIdentify";
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

export default function TriagePage() {
  const [step, setStep] = useState<Step>("animal");
  const [animal, setAnimal] = useState<AnimalType | null>(null);
  const [situation, setSituation] = useState<Situation | null>(null);
  const [description, setDescription] = useState("");
  const [photoHint, setPhotoHint] = useState("");
  const [showPhoto, setShowPhoto] = useState(false);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<Result | null>(null);

  const stepIndex =
    step === "animal" ? 0 : step === "situation" ? 1 : step === "details" ? 2 : 3;

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
      // Network/API failure → deterministic client-side fallback.
      setResult({ ...recommend(animal, situation), source: "rules" });
    } finally {
      setLoading(false);
      setStep("result");
    }
  }

  return (
    <main className="mx-auto flex w-full max-w-2xl flex-1 flex-col px-5 py-8">
      <div className="mb-6 flex items-center gap-2">
        {[0, 1, 2, 3].map((i) => (
          <div
            key={i}
            className={`h-1.5 flex-1 rounded-full ${
              i <= stepIndex ? "bg-emerald-600" : "bg-black/10"
            }`}
          />
        ))}
      </div>

      {step === "animal" && (
        <Section
          title="What kind of animal did you find?"
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
                className={`flex flex-col items-start gap-2 rounded-2xl border bg-white p-4 text-left transition-colors hover:border-emerald-400 hover:bg-emerald-50 ${
                  animal === a.value
                    ? "border-emerald-500 ring-1 ring-emerald-500"
                    : "border-black/10"
                }`}
              >
                <span aria-hidden className="text-2xl">
                  {a.icon}
                </span>
                <span className="font-medium">{a.label}</span>
              </button>
            ))}
          </div>

          <div className="mt-1">
            {!showPhoto ? (
              <button
                onClick={() => setShowPhoto(true)}
                className="text-sm font-medium text-emerald-700 underline underline-offset-4"
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
          title="What's going on with it?"
          subtitle="Choose the option that best describes what you're seeing."
        >
          <div className="flex flex-col gap-2">
            {SITUATIONS.map((s) => (
              <button
                key={s.value}
                onClick={() => {
                  setSituation(s.value);
                  setStep("details");
                }}
                className="rounded-xl border border-black/10 bg-white px-4 py-3 text-left transition-colors hover:border-emerald-400 hover:bg-emerald-50"
              >
                {s.label}
              </button>
            ))}
          </div>
          <button
            onClick={() => setStep("animal")}
            className="mt-5 text-sm text-zinc-500 underline underline-offset-4 hover:text-zinc-700"
          >
            ← Back
          </button>
        </Section>
      )}

      {step === "details" && (
        <Section
          title="Tell us a bit more"
          subtitle="In your own words — the more detail, the better the guidance. (Optional)"
        >
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="e.g. A small bird has been sitting under a tree for an hour, hopping but not flying. There's a cat in the yard."
            rows={5}
            className="w-full resize-none rounded-2xl border border-black/10 bg-white p-4 text-zinc-800 outline-none focus:border-emerald-400"
          />
          <div className="mt-4 flex flex-wrap gap-3">
            <button
              onClick={submit}
              disabled={loading}
              className="inline-flex h-12 items-center justify-center rounded-full bg-emerald-700 px-8 font-medium text-white transition-colors hover:bg-emerald-800 disabled:opacity-60"
            >
              {loading ? "Thinking…" : "Get advice"}
            </button>
            <button
              onClick={() => setStep("situation")}
              className="text-sm text-zinc-500 underline underline-offset-4 hover:text-zinc-700"
            >
              ← Back
            </button>
          </div>
        </Section>
      )}

      {step === "result" && animal && result && (
        <ResultView animal={animal} result={result} onRestart={reset} />
      )}
    </main>
  );
}

function Section({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-4">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">{title}</h1>
        <p className="mt-1 text-zinc-600">{subtitle}</p>
      </div>
      {children}
    </div>
  );
}

function ResultView({
  animal,
  result,
  onRestart,
}: {
  animal: AnimalType;
  result: Result;
  onRestart: () => void;
}) {
  const accent =
    result.verdict === "help"
      ? "border-red-200 bg-red-50"
      : result.verdict === "leave"
        ? "border-emerald-200 bg-emerald-50"
        : "border-amber-200 bg-amber-50";

  const badge =
    result.verdict === "help"
      ? { text: "Needs help", cls: "bg-red-600" }
      : result.verdict === "leave"
        ? { text: "Leave it alone", cls: "bg-emerald-600" }
        : { text: "Check with an expert", cls: "bg-amber-600" };

  return (
    <div className="flex flex-col gap-5">
      <div className={`rounded-2xl border p-5 ${accent}`}>
        <span
          className={`inline-block rounded-full px-3 py-1 text-xs font-semibold text-white ${badge.cls}`}
        >
          {badge.text}
        </span>
        <h1 className="mt-3 text-2xl font-semibold tracking-tight">
          {result.title}
        </h1>
        <p className="mt-2 leading-7 text-zinc-700">{result.reasoning}</p>
      </div>

      <div>
        <h2 className="mb-2 font-semibold">What to do</h2>
        <ol className="flex flex-col gap-2">
          {result.steps.map((s, i) => (
            <li
              key={i}
              className="flex gap-3 rounded-xl border border-black/5 bg-white p-3"
            >
              <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-zinc-100 text-sm font-semibold text-zinc-700">
                {i + 1}
              </span>
              <span className="text-zinc-700">{s}</span>
            </li>
          ))}
        </ol>
      </div>

      {result.showContactCentre && <CentreFinder animal={animal} />}

      <div className="flex flex-wrap gap-3 pt-2">
        <button
          onClick={onRestart}
          className="inline-flex h-11 items-center justify-center rounded-full bg-zinc-900 px-6 font-medium text-white transition-colors hover:bg-zinc-700"
        >
          Start over
        </button>
        <Link
          href="/"
          className="inline-flex h-11 items-center justify-center rounded-full border border-black/10 px-6 font-medium text-zinc-700 transition-colors hover:bg-black/5"
        >
          Home
        </Link>
      </div>

      <p className="pt-2 text-xs leading-5 text-zinc-400">
        This is general guidance from an early prototype, not veterinary advice.
        When in doubt, always contact a licensed wildlife rehabilitator.
        {result.source === "rules" && " (Offline guidance mode.)"}
      </p>
    </div>
  );
}
