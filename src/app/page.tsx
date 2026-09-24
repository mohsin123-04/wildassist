import Link from "next/link";

const STEPS = [
  {
    n: "01",
    title: "Show us",
    label: "Snap a photo or choose the type of animal you found.",
  },
  {
    n: "02",
    title: "Describe it",
    label: "Tell us what's happening in a sentence, and share the location.",
  },
  {
    n: "03",
    title: "Get a plan",
    label: "Clear next steps, and your report reaches the nearest centre.",
  },
];

export default function Home() {
  return (
    <main className="flex flex-1 flex-col">
      {/* Hero */}
      <section className="relative overflow-hidden border-b border-zinc-200">
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 bg-[radial-gradient(60%_60%_at_50%_0%,theme(colors.emerald.50),transparent)]"
        />
        <div className="animate-in relative mx-auto flex w-full max-w-3xl flex-col items-center px-5 py-20 text-center sm:py-28">
          <span className="inline-flex items-center gap-2 rounded-full border border-zinc-200 bg-white px-3 py-1 text-xs font-medium text-zinc-600 shadow-sm">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
            Canada-wide wildlife help
          </span>

          <h1 className="mt-6 max-w-2xl font-display text-4xl font-semibold leading-[1.05] tracking-tight text-zinc-900 sm:text-6xl">
            Found an injured or orphaned wild animal?
          </h1>
          <p className="mt-5 max-w-xl text-lg leading-8 text-zinc-600">
            Take a breath. Answer a few quick questions and WildAssist tells you
            exactly what to do, then connects the animal to the nearest
            rehabilitation centre.
          </p>

          <div className="mt-8 flex flex-col items-center gap-3 sm:flex-row">
            <Link
              href="/triage"
              className="inline-flex h-12 items-center justify-center rounded-xl bg-zinc-900 px-7 text-sm font-semibold text-white shadow-sm transition-all hover:bg-zinc-800 active:scale-[0.98]"
            >
              Start now
            </Link>
            <Link
              href="/emergency"
              className="inline-flex h-12 items-center justify-center rounded-xl border border-zinc-200 bg-white px-7 text-sm font-semibold text-zinc-700 transition-colors hover:bg-zinc-50"
            >
              Emergency basics
            </Link>
          </div>

          <p className="mt-6 text-sm text-zinc-500">
            No account needed. Free, and available across Canada.
          </p>
        </div>
      </section>

      {/* How it works */}
      <section className="mx-auto w-full max-w-5xl px-5 py-16 sm:py-20">
        <div className="grid gap-px overflow-hidden rounded-2xl border border-zinc-200 bg-zinc-200 sm:grid-cols-3">
          {STEPS.map((step) => (
            <div key={step.n} className="bg-white p-6">
              <span className="font-mono text-xs font-medium text-emerald-600">
                {step.n}
              </span>
              <p className="mt-3 font-display text-lg font-semibold tracking-tight text-zinc-900">
                {step.title}
              </p>
              <p className="mt-1.5 text-sm leading-6 text-zinc-600">
                {step.label}
              </p>
            </div>
          ))}
        </div>

        <p className="mx-auto mt-10 max-w-lg text-center text-sm leading-6 text-zinc-500">
          Not every animal that looks alone or hurt needs rescuing. Sometimes the
          kindest thing is to leave it be, and WildAssist helps you tell the
          difference.
        </p>
      </section>
    </main>
  );
}
