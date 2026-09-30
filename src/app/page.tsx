import Link from "next/link";
import { ArrowRight } from "lucide-react";

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
      {/* ---------- Hero: deep forest, asymmetric, phone overlaps down ------- */}
      <section className="relative -mt-16 overflow-x-clip bg-forest-900 text-cream">
        {/* soft radial lift so the flat green has depth */}
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 bg-[radial-gradient(70%_60%_at_85%_0%,rgba(139,189,156,0.18),transparent_60%)]"
        />
        <div className="relative mx-auto grid w-full max-w-6xl items-center gap-10 px-5 pb-24 pt-28 sm:pb-28 sm:pt-36 lg:grid-cols-[1.1fr_0.9fr] lg:gap-8 lg:pb-16">
          <div className="animate-in flex flex-col items-center text-center lg:items-start lg:text-left">
            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-moss-300">
              Wildlife help · US &amp; Canada
            </p>
            <h1 className="mt-5 max-w-2xl font-display text-[2.7rem] font-medium leading-[1.02] text-cream sm:text-6xl">
              Found an injured or orphaned{" "}
              <em className="font-normal italic text-amber-300">wild animal?</em>
            </h1>
            <p className="mt-6 max-w-lg text-lg leading-8 text-cream/75">
              Take a breath. Answer a few quick questions and WildAssist tells
              you exactly what to do, then connects the animal to the nearest
              help, from rehabilitation centres to vets and hotlines.
            </p>
            <div className="mt-8 flex flex-col items-center gap-3 sm:flex-row">
              <Link
                href="/triage"
                className="group inline-flex h-12 items-center justify-center gap-2 rounded-xl bg-cream px-7 text-sm font-semibold text-forest-900 shadow-lg shadow-black/20 transition-all hover:bg-white active:scale-[0.98]"
              >
                Start now
                <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" aria-hidden />
              </Link>
              <Link
                href="/emergency"
                className="inline-flex h-12 items-center justify-center rounded-xl border border-white/20 bg-white/5 px-7 text-sm font-semibold text-cream backdrop-blur transition-colors hover:bg-white/10"
              >
                Emergency basics
              </Link>
            </div>

            <dl className="mt-12 flex flex-wrap items-end justify-center gap-x-9 gap-y-5 lg:justify-start">
              <Stat value="95" label="verified facilities" />
              <Divider />
              <Stat value="US + Canada" label="every state & province" />
              <Divider />
              <Stat value="Free" label="no account needed" />
            </dl>
          </div>

          {/* Real product shot, tilted, overlapping into the cream band below */}
          <div className="animate-in relative mx-auto w-full max-w-[290px] lg:max-w-[320px] lg:-mb-28 lg:translate-y-6">
            <div className="rotate-[2deg] overflow-hidden rounded-[2.4rem] border-[6px] border-forest-950 bg-forest-950 shadow-2xl shadow-black/40 transition-transform duration-500 hover:rotate-0">
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

      {/* ---------- Steps: cream, staggered bento --------------------------- */}
      <section className="bg-cream">
        <div className="mx-auto w-full max-w-6xl px-5 pb-20 pt-20 sm:pb-24 lg:pt-40">
          <div className="grid gap-10 lg:grid-cols-[0.9fr_1.4fr] lg:items-center lg:gap-16">
            <div className="text-center lg:text-left">
              <p className="text-xs font-semibold uppercase tracking-[0.22em] text-clay-600">
                How it works
              </p>
              <h2 className="mt-3 font-display text-3xl font-medium text-stone-900 sm:text-4xl">
                Three steps, a few minutes
              </h2>
              <p className="mt-4 font-display text-lg italic leading-8 text-stone-500">
                Not every animal that looks alone or hurt needs rescuing.
                WildAssist helps you tell the difference.
              </p>
            </div>

            <div className="grid gap-5 sm:grid-cols-3">
              {STEPS.map((step, i) => (
                <div
                  key={step.n}
                  className={`rounded-3xl border border-black/5 bg-white p-6 shadow-sm transition-transform hover:-translate-y-1 ${
                    i === 1 ? "sm:translate-y-6" : i === 2 ? "sm:translate-y-12" : ""
                  }`}
                >
                  <span className="font-display text-4xl font-normal text-clay-600">
                    {step.n}
                  </span>
                  <p className="mt-4 font-display text-xl font-medium text-stone-900">
                    {step.title}
                  </p>
                  <p className="mt-1.5 text-sm leading-6 text-stone-600">
                    {step.label}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ---------- Volunteer: forest card floating on cream --------------- */}
      <section className="bg-cream px-5 pb-24">
        <div className="relative mx-auto w-full max-w-6xl overflow-hidden rounded-[2rem] bg-forest-900 px-8 py-14 text-cream shadow-xl shadow-forest-900/20 sm:px-12">
          <div
            aria-hidden
            className="pointer-events-none absolute inset-0 bg-[radial-gradient(60%_120%_at_100%_0%,rgba(139,189,156,0.16),transparent_60%)]"
          />
          <div className="relative flex flex-col items-center gap-8 text-center sm:flex-row sm:justify-between sm:text-left">
            <div className="max-w-xl">
              <p className="text-xs font-semibold uppercase tracking-[0.22em] text-moss-300">
                Get involved
              </p>
              <h2 className="mt-3 font-display text-3xl font-medium text-cream sm:text-4xl">
                Can you drive an animal to a centre?
              </h2>
              <p className="mt-3 leading-7 text-cream/75">
                Volunteer drivers are the link between a finder and a
                rehabilitation centre. Sign up, get approved by a centre near
                you, and claim pickups when you are free.
              </p>
            </div>
            <Link
              href="/login?signup=volunteer"
              className="inline-flex h-12 shrink-0 items-center justify-center gap-2 rounded-xl bg-cream px-7 text-sm font-semibold text-forest-900 shadow-lg shadow-black/20 transition-all hover:bg-white active:scale-[0.98]"
            >
              Become a volunteer
              <ArrowRight className="h-4 w-4" aria-hidden />
            </Link>
          </div>
        </div>
      </section>
    </main>
  );
}

function Stat({ value, label }: { value: string; label: string }) {
  return (
    <div>
      <dt className="sr-only">{label}</dt>
      <dd className="font-display text-3xl font-medium leading-none text-cream">
        {value}
      </dd>
      <p className="mt-1.5 text-xs text-cream/60">{label}</p>
    </div>
  );
}

function Divider() {
  return <div aria-hidden className="hidden h-9 w-px bg-white/15 sm:block" />;
}
