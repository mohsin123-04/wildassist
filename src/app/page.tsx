import Link from "next/link";
import { ArrowRight, MapPin, Car, Building2 } from "lucide-react";

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

            <ol className="relative ml-1 flex flex-col gap-9 border-l-2 border-stone-300/70 pl-8">
              {STEPS.map((step) => (
                <li key={step.title} className="relative">
                  <span
                    aria-hidden
                    className="absolute -left-[2.375rem] top-1.5 h-3 w-3 rounded-full border-2 border-clay-600 bg-cream"
                  />
                  <h3 className="font-display text-xl font-medium text-stone-900">
                    {step.title}
                  </h3>
                  <p className="mt-1 max-w-sm leading-7 text-stone-600">
                    {step.label}
                  </p>
                </li>
              ))}
            </ol>
          </div>
        </div>
      </section>

      {/* ---------- Volunteer: forest card showing the rescue route -------- */}
      <section className="bg-cream px-5 pb-24">
        <div className="relative mx-auto grid w-full max-w-6xl overflow-hidden rounded-[2rem] bg-forest-900 text-cream shadow-xl shadow-forest-900/20 lg:grid-cols-[1.05fr_0.95fr]">
          <div
            aria-hidden
            className="pointer-events-none absolute inset-0 bg-[radial-gradient(70%_120%_at_0%_0%,rgba(139,189,156,0.16),transparent_55%)]"
          />

          {/* copy */}
          <div className="relative px-8 py-14 sm:px-12">
            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-moss-300">
              Get involved
            </p>
            <h2 className="mt-3 max-w-md font-display text-3xl font-medium text-cream sm:text-4xl">
              Can you drive an animal to a centre?
            </h2>
            <p className="mt-4 max-w-md leading-7 text-cream/75">
              Volunteer drivers are the missing link between a finder and a
              rehabilitation centre. Sign up, get approved by a centre near you,
              and claim pickups when the timing works for you.
            </p>
            <Link
              href="/login?signup=volunteer"
              className="group mt-8 inline-flex h-12 items-center justify-center gap-2 rounded-xl bg-cream px-7 text-sm font-semibold text-forest-900 shadow-lg shadow-black/20 transition-all hover:bg-white active:scale-[0.98]"
            >
              Become a volunteer
              <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" aria-hidden />
            </Link>
          </div>

          {/* the route a volunteer completes */}
          <div className="relative border-t border-white/10 px-8 py-12 sm:px-12 lg:border-l lg:border-t-0">
            <p className="mb-7 text-[0.7rem] font-semibold uppercase tracking-[0.22em] text-cream/40">
              One pickup, start to finish
            </p>
            <ol className="relative">
              <RouteStop
                icon={MapPin}
                label="A finder reports it"
                sub="An injured animal, pinned on the map."
              />
              <RouteStop
                icon={Car}
                label="You claim the pickup"
                sub="Drive it over whenever you are free."
                highlight
              />
              <RouteStop
                icon={Building2}
                label="Safe at a centre"
                sub="Rehabbers take over the care."
                last
              />
            </ol>
          </div>
        </div>
      </section>
    </main>
  );
}

function RouteStop({
  icon: Icon,
  label,
  sub,
  highlight = false,
  last = false,
}: {
  icon: typeof MapPin;
  label: string;
  sub: string;
  highlight?: boolean;
  last?: boolean;
}) {
  return (
    <li className="relative flex items-start gap-4 pb-7 last:pb-0">
      {!last && (
        <span
          aria-hidden
          className="absolute left-[1.375rem] top-[2.9rem] bottom-1 w-px -translate-x-1/2 border-l border-dashed border-cream/25"
        />
      )}
      <span
        className={`relative flex h-11 w-11 shrink-0 items-center justify-center rounded-full border ${
          highlight
            ? "border-amber-300/70 bg-amber-300/15 text-amber-200"
            : "border-white/20 bg-white/5 text-cream"
        }`}
      >
        <Icon className="h-5 w-5" aria-hidden />
      </span>
      <div className="pt-1.5">
        <p className="font-display text-base font-medium text-cream">{label}</p>
        <p className="mt-0.5 text-sm text-cream/60">{sub}</p>
      </div>
    </li>
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
