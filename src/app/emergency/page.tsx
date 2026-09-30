import Link from "next/link";
import type { Metadata } from "next";
import { Check, X } from "lucide-react";
import NearestHelpButton from "@/components/NearestHelpButton";

export const metadata: Metadata = {
  title: "Wildlife emergency basics | WildAssist",
  description:
    "Quick do's and don'ts for when you find an injured or orphaned wild animal in the US or Canada, plus how to reach a wildlife hotline.",
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
  "Don't try to treat injuries yourself or keep the animal as a pet (it's also illegal without a license across the US and Canada).",
  "Don't assume a lone baby animal is orphaned. A parent is often nearby.",
];

export default function EmergencyPage() {
  return (
    <main className="animate-in mx-auto flex w-full max-w-xl flex-1 flex-col gap-6 px-5 py-10">
      <div>
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-clay-600">
          Quick reference
        </p>
        <h1 className="mt-2 font-display text-4xl font-medium text-stone-900">
          Wildlife emergency basics
        </h1>
        <p className="mt-2 text-stone-500">
          A fast reference while you get expert help. Not sure what you&apos;re
          dealing with?{" "}
          <Link
            href="/triage"
            className="font-medium text-emerald-700 underline underline-offset-4 hover:text-emerald-700"
          >
            Answer a few questions
          </Link>
          .
        </p>
      </div>

      <NearestHelpButton />

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="rounded-2xl border border-emerald-100 bg-emerald-50/50 p-6">
          <h2 className="mb-3 flex items-center gap-2 text-sm font-semibold uppercase tracking-wide text-emerald-700">
            <span className="flex h-5 w-5 items-center justify-center rounded-full bg-emerald-700 text-white">
              <Check className="h-3 w-3" />
            </span>
            Do
          </h2>
          <ul className="flex flex-col gap-2.5 text-sm leading-6 text-stone-700">
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
          <h2 className="mb-3 flex items-center gap-2 text-sm font-semibold uppercase tracking-wide text-rose-700">
            <span className="flex h-5 w-5 items-center justify-center rounded-full bg-rose-500 text-white">
              <X className="h-3 w-3" />
            </span>
            Don&apos;t
          </h2>
          <ul className="flex flex-col gap-2.5 text-sm leading-6 text-stone-700">
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
          className="inline-flex h-11 items-center justify-center rounded-xl bg-stone-900 px-6 text-sm font-semibold text-white transition-colors hover:bg-stone-800"
        >
          Start guided help
        </Link>
        <Link
          href="/"
          className="inline-flex h-11 items-center justify-center rounded-xl border border-stone-200 bg-white px-6 text-sm font-semibold text-stone-700 transition-colors hover:bg-stone-50"
        >
          Home
        </Link>
      </div>

      <p className="text-xs leading-5 text-stone-500">
        General guidance only, not veterinary advice. Contact details and advice
        should be confirmed with a licensed wildlife rehabilitator.
      </p>
    </main>
  );
}
