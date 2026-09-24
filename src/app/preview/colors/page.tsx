"use client";

import { useState } from "react";
import PreviewNav from "../PreviewNav";

type Palette = {
  name: string;
  accent: string;
  accentText: string; // text/on-white accent (slightly darker for contrast)
  soft: string; // tint for chips/icon backgrounds
  bg: string; // page background
  cta: "accent" | "ink"; // primary button color
};

const PALETTES: Palette[] = [
  { name: "Emerald (current)", accent: "#059669", accentText: "#047857", soft: "#ecfdf5", bg: "#ffffff", cta: "ink" },
  { name: "Forest", accent: "#15803d", accentText: "#166534", soft: "#f0fdf4", bg: "#fbfdfb", cta: "accent" },
  { name: "Teal", accent: "#0d9488", accentText: "#0f766e", soft: "#f0fdfa", bg: "#ffffff", cta: "accent" },
  { name: "Ocean", accent: "#2563eb", accentText: "#1d4ed8", soft: "#eff6ff", bg: "#ffffff", cta: "accent" },
  { name: "Pine + sand", accent: "#3f6212", accentText: "#3f6212", soft: "#f1f4e8", bg: "#faf9f4", cta: "accent" },
  { name: "Terracotta", accent: "#c2410c", accentText: "#9a3412", soft: "#fff7ed", bg: "#fffdfb", cta: "accent" },
  { name: "Slate (mono)", accent: "#0f766e", accentText: "#334155", soft: "#f1f5f9", bg: "#ffffff", cta: "ink" },
];

const STEPS = [
  { n: "01", title: "Show us", label: "Snap a photo or choose the animal you found." },
  { n: "02", title: "Describe it", label: "Tell us what's happening, and share the location." },
  { n: "03", title: "Get a plan", label: "Clear next steps, routed to the nearest centre." },
];

export default function ColorPlayground() {
  const [p, setP] = useState<Palette>(PALETTES[0]);
  const ctaBg = p.cta === "accent" ? p.accent : "#18181b";

  return (
    <div style={{ background: p.bg }} className="min-h-screen">
      <PreviewNav active="Clean (live)" />

      {/* Swatch picker */}
      <div className="mx-auto max-w-5xl px-5 pt-8">
        <p className="mb-2 text-xs font-medium uppercase tracking-widest text-zinc-400">
          Tap a palette
        </p>
        <div className="flex flex-wrap gap-2">
          {PALETTES.map((opt) => (
            <button
              key={opt.name}
              onClick={() => setP(opt)}
              className={`flex items-center gap-2 rounded-full border px-3 py-1.5 text-sm font-medium transition-all ${
                p.name === opt.name
                  ? "border-zinc-900 ring-1 ring-zinc-900"
                  : "border-zinc-200 hover:border-zinc-300"
              }`}
            >
              <span className="h-3.5 w-3.5 rounded-full" style={{ background: opt.accent }} />
              {opt.name}
            </button>
          ))}
        </div>
      </div>

      {/* Hero */}
      <section className="relative overflow-hidden">
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0"
          style={{ background: `radial-gradient(60% 55% at 50% 0%, ${p.soft}, transparent)` }}
        />
        <div className="relative mx-auto flex max-w-3xl flex-col items-center px-5 py-20 text-center">
          <span
            className="inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs font-medium"
            style={{ borderColor: "#e4e4e7", background: "#fff", color: "#52525b" }}
          >
            <span className="h-1.5 w-1.5 rounded-full" style={{ background: p.accent }} />
            Canada-wide wildlife help
          </span>

          <h1
            className="mt-6 max-w-2xl text-4xl font-semibold leading-[1.05] tracking-tight sm:text-6xl"
            style={{ color: "#09090b", letterSpacing: "-0.02em" }}
          >
            Found an injured or orphaned wild animal?
          </h1>
          <p className="mt-5 max-w-xl text-lg leading-8 text-zinc-600">
            Take a breath. Answer a few quick questions and WildAssist tells you
            exactly what to do, then connects the animal to the nearest centre.
          </p>

          <div className="mt-8 flex flex-col items-center gap-3 sm:flex-row">
            <a
              href="#"
              className="inline-flex h-12 items-center justify-center rounded-xl px-7 text-sm font-semibold text-white shadow-sm transition-transform hover:scale-[1.02]"
              style={{ background: ctaBg }}
            >
              Start now
            </a>
            <a
              href="#"
              className="inline-flex h-12 items-center justify-center rounded-xl border border-zinc-200 bg-white px-7 text-sm font-semibold text-zinc-700"
            >
              Emergency basics
            </a>
          </div>
        </div>
      </section>

      {/* Steps */}
      <section className="mx-auto max-w-5xl px-5 pb-24">
        <div className="grid gap-px overflow-hidden rounded-2xl border border-zinc-200 bg-zinc-200 sm:grid-cols-3">
          {STEPS.map((s) => (
            <div key={s.n} className="bg-white p-6">
              <span className="font-mono text-xs font-semibold" style={{ color: p.accentText }}>
                {s.n}
              </span>
              <p className="mt-3 text-lg font-semibold tracking-tight text-zinc-900">
                {s.title}
              </p>
              <p className="mt-1.5 text-sm leading-6 text-zinc-600">{s.label}</p>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
