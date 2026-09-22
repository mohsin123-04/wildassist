import Link from "next/link";

const STEPS = [
  { icon: "📸", title: "Show us", label: "Snap a photo or pick the animal type" },
  { icon: "💬", title: "Describe it", label: "Tell us what's happening in a sentence" },
  { icon: "🧭", title: "Get a plan", label: "Clear next steps and the nearest centre" },
];

export default function Home() {
  return (
    <main className="relative flex flex-1 flex-col items-center justify-center overflow-hidden px-5 py-16">
      {/* soft nature glow */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-0 h-80 bg-gradient-to-b from-emerald-100/60 via-emerald-50/40 to-transparent"
      />

      <div className="animate-in relative mx-auto flex w-full max-w-xl flex-col items-center gap-8 text-center">
        <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-200 bg-white/70 px-3 py-1 text-xs font-medium text-emerald-800">
          🌿 Ontario wildlife help
        </span>

        <div className="flex flex-col gap-4">
          <h1 className="font-display text-4xl font-semibold leading-[1.1] tracking-tight text-emerald-950 sm:text-5xl">
            Found an injured or orphaned wild animal?
          </h1>
          <p className="mx-auto max-w-md text-lg leading-8 text-zinc-600">
            Take a breath. Answer a few quick questions and we&apos;ll tell you
            exactly what to do, and where to get help.
          </p>
        </div>

        <div className="flex flex-col items-center gap-3">
          <Link
            href="/triage"
            className="inline-flex h-14 items-center justify-center rounded-full bg-emerald-700 px-9 text-lg font-medium text-white shadow-lg shadow-emerald-700/20 transition-all hover:bg-emerald-800 hover:shadow-emerald-800/25 active:scale-[0.98]"
          >
            Start now
          </Link>
          <Link
            href="/emergency"
            className="text-sm font-medium text-emerald-700 underline underline-offset-4 hover:text-emerald-900"
          >
            Or jump to emergency basics
          </Link>
        </div>

        <div className="mt-4 grid w-full gap-3 text-left sm:grid-cols-3">
          {STEPS.map((step) => (
            <div
              key={step.title}
              className="rounded-2xl border border-black/5 bg-white p-4 shadow-sm"
            >
              <span aria-hidden className="text-2xl">
                {step.icon}
              </span>
              <p className="mt-2 font-display text-base font-semibold text-emerald-950">
                {step.title}
              </p>
              <p className="mt-0.5 text-sm leading-6 text-zinc-600">
                {step.label}
              </p>
            </div>
          ))}
        </div>

        <p className="mx-auto max-w-sm text-sm leading-6 text-zinc-500">
          Not every animal that looks alone or hurt needs rescuing. Sometimes the
          kindest thing is to leave it be. We&apos;ll help you tell the difference.
        </p>
      </div>
    </main>
  );
}
