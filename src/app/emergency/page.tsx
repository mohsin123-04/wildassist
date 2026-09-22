import Link from "next/link";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Wildlife emergency basics | WildAssist",
  description:
    "Quick do's and don'ts for when you find an injured or orphaned wild animal in Ontario, plus how to reach a wildlife hotline.",
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
  "Don't try to treat injuries yourself or keep the animal as a pet (it's also illegal in Ontario).",
  "Don't assume a lone baby animal is orphaned. A parent is often nearby.",
];

export default function EmergencyPage() {
  return (
    <main className="animate-in mx-auto flex w-full max-w-xl flex-1 flex-col gap-6 px-5 py-8">
      <div>
        <p className="text-xs font-semibold uppercase tracking-wide text-emerald-600">
          Quick reference
        </p>
        <h1 className="mt-1 font-display text-3xl font-semibold tracking-tight text-emerald-950">
          Wildlife emergency basics
        </h1>
        <p className="mt-2 text-zinc-600">
          A fast reference while you get expert help. Not sure what you&apos;re
          dealing with?{" "}
          <Link
            href="/triage"
            className="font-medium text-emerald-700 underline underline-offset-4"
          >
            Answer a few questions
          </Link>
          .
        </p>
      </div>

      <div className="rounded-3xl border border-emerald-200 bg-white p-6 shadow-sm">
        <h2 className="font-display text-lg font-semibold text-emerald-950">
          Reach a wildlife hotline
        </h2>
        <p className="mt-1 text-sm leading-6 text-zinc-600">
          The Toronto Wildlife Centre runs a hotline that can advise on most
          Ontario situations.
        </p>
        <a
          href="tel:4166310662"
          className="mt-4 inline-flex h-12 items-center justify-center rounded-full bg-emerald-700 px-7 font-medium text-white shadow-lg shadow-emerald-700/20 transition-all hover:bg-emerald-800 active:scale-[0.98]"
        >
          📞 Call 416-631-0662
        </a>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="rounded-3xl border border-emerald-200 bg-emerald-50 p-6">
          <h2 className="mb-3 font-display text-lg font-semibold text-emerald-900">
            Do
          </h2>
          <ul className="flex flex-col gap-2.5 text-sm leading-6 text-emerald-950">
            {DOS.map((d, i) => (
              <li key={i} className="flex gap-2">
                <span aria-hidden className="text-emerald-600">
                  ✓
                </span>
                <span>{d}</span>
              </li>
            ))}
          </ul>
        </div>
        <div className="rounded-3xl border border-rose-200 bg-rose-50 p-6">
          <h2 className="mb-3 font-display text-lg font-semibold text-rose-900">
            Don&apos;t
          </h2>
          <ul className="flex flex-col gap-2.5 text-sm leading-6 text-rose-950">
            {DONTS.map((d, i) => (
              <li key={i} className="flex gap-2">
                <span aria-hidden className="text-rose-500">
                  ✕
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
          className="inline-flex h-11 items-center justify-center rounded-full bg-emerald-700 px-6 font-medium text-white transition-colors hover:bg-emerald-800"
        >
          Start guided help
        </Link>
        <Link
          href="/"
          className="inline-flex h-11 items-center justify-center rounded-full border border-black/10 bg-white px-6 font-medium text-zinc-700 transition-colors hover:bg-black/5"
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
