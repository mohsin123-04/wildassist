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
      <section className="border-b border-black/5">
        <div className="mx-auto grid w-full max-w-6xl items-center gap-12 px-5 py-16 sm:py-20 lg:grid-cols-[1.15fr_1fr] lg:py-28">
          <div className="flex flex-col items-center text-center lg:items-start lg:text-left">
            <p
              className="animate-in text-xs font-semibold uppercase tracking-[0.2em] text-clay-600"
              style={{ animationDelay: "0.02s" }}
            >
              Wildlife help · US &amp; Canada
            </p>

            <h1
              className="animate-in mt-5 max-w-2xl font-display text-[2.6rem] font-medium leading-[1.02] text-stone-900 sm:text-6xl"
              style={{ animationDelay: "0.08s" }}
            >
              Found an injured or orphaned{" "}
              <em className="font-normal italic text-clay-600">wild animal?</em>
            </h1>

            <p
              className="animate-in mt-6 max-w-xl text-lg leading-8 text-stone-600"
              style={{ animationDelay: "0.16s" }}
            >
              Take a breath. Answer a few quick questions and WildAssist tells
              you exactly what to do, then connects the animal to the nearest
              help — from wildlife rehabilitation centres to vets and hotlines.
            </p>

            <div
              className="animate-in mt-8 flex flex-col items-center gap-3 sm:flex-row"
              style={{ animationDelay: "0.24s" }}
            >
              <Link
                href="/triage"
                className="inline-flex h-12 items-center justify-center rounded-xl bg-stone-900 px-7 text-sm font-semibold text-white shadow-sm transition-all hover:bg-stone-800 active:scale-[0.98]"
              >
                Start now
              </Link>
              <Link
                href="/emergency"
                className="inline-flex h-12 items-center justify-center rounded-xl border border-stone-300 bg-white px-7 text-sm font-semibold text-stone-700 transition-colors hover:bg-stone-50"
              >
                Emergency basics
              </Link>
            </div>

            {/* Earned, verifiable stats — not marketing fluff. */}
            <dl
              className="animate-in mt-12 flex flex-wrap items-end justify-center gap-x-9 gap-y-5 lg:justify-start"
              style={{ animationDelay: "0.32s" }}
            >
              <Stat value="95" label="verified facilities" />
              <Divider />
              <Stat value="US + Canada" label="every state & province" />
              <Divider />
              <Stat value="Free" label="no account needed" />
            </dl>
          </div>

          {/* Real product shot: the triage tool, in a simple phone frame. */}
          <div
            className="animate-in mx-auto w-full max-w-[300px] lg:max-w-[320px]"
            style={{ animationDelay: "0.4s" }}
          >
            <div className="overflow-hidden rounded-[2.4rem] border-[6px] border-stone-900 bg-stone-900 shadow-2xl shadow-stone-900/20">
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
      <section className="mx-auto w-full max-w-5xl px-5 py-16 sm:py-24">
        <h2 className="text-center font-display text-3xl font-medium text-stone-900 sm:text-4xl">
          Three steps, a few minutes
        </h2>
        <div className="mt-10 grid gap-8 sm:grid-cols-3 sm:gap-6">
          {STEPS.map((step) => (
            <div key={step.n} className="text-center sm:text-left">
              <span className="font-display text-4xl font-normal text-clay-600">
                {step.n}
              </span>
              <p className="mt-3 font-display text-xl font-medium text-stone-900">
                {step.title}
              </p>
              <p className="mt-1.5 text-sm leading-6 text-stone-600">
                {step.label}
              </p>
            </div>
          ))}
        </div>

        <p className="mx-auto mt-14 max-w-xl text-center font-display text-lg italic leading-8 text-stone-500">
          Not every animal that looks alone or hurt needs rescuing. Sometimes the
          kindest thing is to leave it be — and WildAssist helps you tell the
          difference.
        </p>
      </section>

      {/* Volunteer recruitment */}
      <section className="border-t border-black/5 bg-muted">
        <div className="mx-auto flex w-full max-w-5xl flex-col items-center gap-6 px-5 py-16 text-center sm:flex-row sm:justify-between sm:text-left">
          <div className="max-w-xl">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-clay-600">
              Get involved
            </p>
            <h2 className="mt-2 font-display text-3xl font-medium text-stone-900">
              Can you drive an animal to a centre?
            </h2>
            <p className="mt-3 leading-7 text-stone-600">
              Volunteer drivers are the link between a finder and a
              rehabilitation centre. Sign up, get approved by a centre near you,
              and claim pickups when you are free.
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

function Stat({ value, label }: { value: string; label: string }) {
  return (
    <div>
      <dt className="sr-only">{label}</dt>
      <dd className="font-display text-3xl font-medium leading-none text-stone-900">
        {value}
      </dd>
      <p className="mt-1.5 text-xs text-stone-500">{label}</p>
    </div>
  );
}

function Divider() {
  return <div aria-hidden className="hidden h-9 w-px bg-stone-200 sm:block" />;
}
