import Link from "next/link";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Wildlife emergency basics | WildAssist",
  description:
    "Quick do's and don'ts for when you find an injured or orphaned wild animal in Canada, plus how to reach a wildlife hotline.",
};

const DOS = [
  "Keep people and pets well away to reduce the animal's stress.",
  "If the animal is somewhere dangerous (like a road) and it's safe for you, note the exact location.",
  "If advised to contain it, use a ventilated cardboard box lined with a towel, kept warm, dark, and quiet.",
  "Call a licensed wildlife rehabilitator before acting whenever you can.",
];

const DONTS = [
  "Don't give food or water. The wrong food can seriously harm or kill wildlife.",
  "Don't handle raptors, herons, raccoons, foxes, skunks, or bats. Bats and other mammals can carry rabies, so never touch a bat with bare hands.",
  "Don't try to treat injuries yourself or keep the animal as a pet (it's also illegal across Canada).",
  "Don't assume a lone baby animal is orphaned. A parent is often nearby.",
];

export default function EmergencyPage() {
  return (
    <main className="animate-in mx-auto flex w-full max-w-xl flex-1 flex-col gap-6 px-5 py-10">
      <div>
        <p className="text-xs font-medium uppercase tracking-widest text-zinc-400">
          Quick reference
        </p>
        <h1 className="mt-2 font-display text-3xl font-semibold tracking-tight text-zinc-900">
          Wildlife emergency basics
        </h1>
        <p className="mt-2 text-zinc-500">
          A fast reference while you get expert help. Not sure what you&apos;re
          dealing with?{" "}
          <Link
            href="/triage"
            className="font-medium text-emerald-600 underline underline-offset-4 hover:text-emerald-700"
          >
            Answer a few questions
          </Link>
          .
        </p>
      </div>

      <div className="rounded-2xl border border-zinc-200 bg-white p-6">
        <h2 className="font-display text-lg font-semibold tracking-tight text-zinc-900">
          Reach a wildlife rehabilitator
        </h2>
        <p className="mt-1 text-sm leading-6 text-zinc-600">
          The fastest help comes from a licensed wildlife rehabilitator or vet
          near you. Use the guided tool to find and reach the nearest one for
          your situation.
        </p>
        <Link
          href="/triage"
          className="mt-4 inline-flex h-11 items-center justify-center rounded-xl bg-zinc-900 px-6 text-sm font-semibold text-white shadow-sm transition-all hover:bg-zinc-800 active:scale-[0.98]"
        >
          Find the nearest help
        </Link>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="rounded-2xl border border-emerald-100 bg-emerald-50/50 p-6">
          <h2 className="mb-3 flex items-center gap-2 font-display text-sm font-semibold uppercase tracking-wide text-emerald-700">
            <span className="flex h-5 w-5 items-center justify-center rounded-full bg-emerald-600 text-xs text-white">
              ✓
            </span>
            Do
          </h2>
          <ul className="flex flex-col gap-2.5 text-sm leading-6 text-zinc-700">
            {DOS.map((d, i) => (
              <li key={i} className="flex gap-2">
                <span aria-hidden className="mt-0.5 text-emerald-500">
                  •
                </span>
                <span>{d}</span>
              </li>
            ))}
          </ul>
        </div>
        <div className="rounded-2xl border border-rose-100 bg-rose-50/50 p-6">
          <h2 className="mb-3 flex items-center gap-2 font-display text-sm font-semibold uppercase tracking-wide text-rose-700">
            <span className="flex h-5 w-5 items-center justify-center rounded-full bg-rose-500 text-xs text-white">
              ✕
            </span>
            Don&apos;t
          </h2>
          <ul className="flex flex-col gap-2.5 text-sm leading-6 text-zinc-700">
            {DONTS.map((d, i) => (
              <li key={i} className="flex gap-2">
                <span aria-hidden className="mt-0.5 text-rose-400">
                  •
                </span>
                <span>{d}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>

      <div className="flex flex-wrap gap-3">
        <Link
          href="/triage"
          className="inline-flex h-11 items-center justify-center rounded-xl bg-zinc-900 px-6 text-sm font-semibold text-white transition-colors hover:bg-zinc-800"
        >
          Start guided help
        </Link>
        <Link
          href="/"
          className="inline-flex h-11 items-center justify-center rounded-xl border border-zinc-200 bg-white px-6 text-sm font-semibold text-zinc-700 transition-colors hover:bg-zinc-50"
        >
          Home
        </Link>
      </div>

      <p className="text-xs leading-5 text-zinc-400">
        General guidance only, not veterinary advice. Contact details and advice
        should be confirmed with a licensed wildlife rehabilitator.
      </p>
    </main>
  );
}
