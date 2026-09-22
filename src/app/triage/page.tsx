"use client";

import Link from "next/link";
import { useState } from "react";
import CentreFinder from "@/components/CentreFinder";
import {
  ANIMAL_TYPES,
  SITUATIONS,
  recommend,
  type AnimalType,
  type Situation,
} from "@/lib/triage";

type Step = "animal" | "situation" | "result";

export default function TriagePage() {
  const [step, setStep] = useState<Step>("animal");
  const [animal, setAnimal] = useState<AnimalType | null>(null);
  const [situation, setSituation] = useState<Situation | null>(null);

  const stepIndex = step === "animal" ? 0 : step === "situation" ? 1 : 2;

  function reset() {
    setAnimal(null);
    setSituation(null);
    setStep("animal");
  }

  return (
    <main className="mx-auto flex w-full max-w-2xl flex-1 flex-col px-5 py-8">
      {/* Progress */}
      <div className="mb-6 flex items-center gap-2">
        {[0, 1, 2].map((i) => (
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
                className="flex flex-col items-start gap-2 rounded-2xl border border-black/10 bg-white p-4 text-left transition-colors hover:border-emerald-400 hover:bg-emerald-50"
              >
                <span aria-hidden className="text-2xl">
                  {a.icon}
                </span>
                <span className="font-medium">{a.label}</span>
              </button>
            ))}
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
                  setStep("result");
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

      {step === "result" && animal && situation && (
        <Result animal={animal} situation={situation} onRestart={reset} />
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

function Result({
  animal,
  situation,
  onRestart,
}: {
  animal: AnimalType;
  situation: Situation;
  onRestart: () => void;
}) {
  const rec = recommend(animal, situation);

  const accent =
    rec.verdict === "help"
      ? "border-red-200 bg-red-50"
      : rec.verdict === "leave"
        ? "border-emerald-200 bg-emerald-50"
        : "border-amber-200 bg-amber-50";

  const badge =
    rec.verdict === "help"
      ? { text: "Needs help", cls: "bg-red-600" }
      : rec.verdict === "leave"
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
          {rec.title}
        </h1>
        <p className="mt-2 leading-7 text-zinc-700">{rec.reasoning}</p>
      </div>

      <div>
        <h2 className="mb-2 font-semibold">What to do</h2>
        <ol className="flex flex-col gap-2">
          {rec.steps.map((s, i) => (
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

      {rec.showContactCentre && <CentreFinder animal={animal} />}

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
      </p>
    </div>
  );
}
