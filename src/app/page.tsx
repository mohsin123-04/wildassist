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
        <div className="animate-in relative mx-auto grid w-full max-w-6xl items-center gap-12 px-5 py-16 sm:py-20 lg:grid-cols-[1.2fr_1fr] lg:py-24">
          <div className="flex flex-col items-center text-center lg:items-start lg:text-left">
            <span className="inline-flex items-center gap-2 rounded-full border border-zinc-200 bg-white px-3 py-1 text-xs font-medium text-zinc-600 shadow-sm">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
              Wildlife help across the US &amp; Canada
            </span>

            <h1 className="mt-6 max-w-2xl font-display text-4xl font-semibold leading-[1.05] tracking-tight text-zinc-900 sm:text-6xl">
              Found an injured or orphaned wild animal?
            </h1>
            <p className="mt-5 max-w-xl text-lg leading-8 text-zinc-600">
              Take a breath. Answer a few quick questions and WildAssist tells
              you exactly what to do, then connects the animal to the nearest
              help, from wildlife rehabilitation centres to vets and hotlines.
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

            {/* Earned, verifiable stats — not marketing fluff. */}
            <div className="mt-10 flex flex-wrap items-center justify-center gap-x-8 gap-y-4 lg:justify-start">
              <div>
                <p className="font-display text-2xl font-semibold text-zinc-900">
                  95
                </p>
                <p className="text-xs text-zinc-500">verified facilities</p>
              </div>
              <div className="hidden h-8 w-px bg-zinc-200 sm:block" />
              <div>
                <p className="font-display text-2xl font-semibold text-zinc-900">
                  US + Canada
                </p>
                <p className="text-xs text-zinc-500">
                  every state &amp; province
                </p>
              </div>
              <div className="hidden h-8 w-px bg-zinc-200 sm:block" />
              <div>
                <p className="font-display text-2xl font-semibold text-zinc-900">
                  Free
                </p>
                <p className="text-xs text-zinc-500">no account needed</p>
              </div>
            </div>
          </div>

          {/* Real product shot: the triage tool, in a simple phone frame. */}
          <div className="mx-auto w-full max-w-[300px] lg:max-w-[320px]">
            <div className="overflow-hidden rounded-[2.2rem] border-[6px] border-zinc-900 bg-zinc-900 shadow-2xl shadow-zinc-900/20">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src="/screenshots/triage-phone.png"
                alt="The WildAssist triage tool: pick the animal you found and get clear next steps"
                width={780}
                height={1440}
                className="block w-full"
              />
            </div>
          </div>
        </div>
      </section>

      {/* How it works */}
      <section className="mx-auto w-full max-w-5xl px-5 py-16 sm:py-20">
        <div className="grid gap-px overflow-hidden rounded-2xl border border-zinc-200 bg-zinc-200 sm:grid-cols-3">
          {STEPS.map((step) => (
            <div key={step.n} className="bg-white p-6">
              <span className="font-mono text-xs font-medium text-emerald-700">
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

      {/* Volunteer recruitment */}
      <section className="border-t border-zinc-200 bg-zinc-50">
        <div className="mx-auto flex w-full max-w-5xl flex-col items-center gap-6 px-5 py-14 text-center sm:flex-row sm:justify-between sm:text-left">
          <div className="max-w-xl">
            <p className="text-xs font-medium uppercase tracking-widest text-emerald-700">
              Get involved
            </p>
            <h2 className="mt-2 font-display text-2xl font-semibold tracking-tight text-zinc-900">
              Can you drive an animal to a centre?
            </h2>
            <p className="mt-2 leading-7 text-zinc-600">
              Volunteer drivers are the link between a finder and a rehabilitation
              centre. Sign up, get approved by a centre near you, and claim
              pickups when you are free.
            </p>
          </div>
          <Link
            href="/login?signup=volunteer"
            className="inline-flex h-12 shrink-0 items-center justify-center rounded-xl bg-emerald-700 px-7 text-sm font-semibold text-white shadow-sm transition-all hover:bg-emerald-800 active:scale-[0.98]"
          >
            Become a volunteer
          </Link>
        </div>
      </section>
    </main>
  );
}
