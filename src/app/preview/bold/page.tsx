import { Space_Grotesk } from "next/font/google";
import PreviewNav from "../PreviewNav";

const grotesk = Space_Grotesk({ subsets: ["latin"], weight: ["500", "700"] });

const STEPS = [
  { n: "01", title: "SHOW US", label: "Snap a photo or pick the animal you found." },
  { n: "02", title: "DESCRIBE IT", label: "Tell us what's happening, and where." },
  { n: "03", title: "GET A PLAN", label: "Clear steps. Routed to the nearest centre." },
];

export default function BoldPreview() {
  return (
    <div className={`${grotesk.className} min-h-screen`} style={{ background: "#0b1f17", color: "#eafff4" }}>
      <PreviewNav active="Bold" />

      {/* Hero */}
      <section className="relative overflow-hidden">
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 opacity-40"
          style={{
            background:
              "radial-gradient(80% 60% at 80% 0%, #16c47f55 0%, transparent 55%), radial-gradient(60% 50% at 10% 20%, #a3e63533 0%, transparent 50%)",
          }}
        />
        <div className="relative mx-auto max-w-5xl px-5 py-24">
          <span
            className="inline-flex items-center gap-2 rounded-full px-4 py-1.5 text-sm font-medium"
            style={{ background: "#16c47f22", color: "#7cf3bd", border: "1px solid #16c47f44" }}
          >
            <span className="h-2 w-2 rounded-full" style={{ background: "#a3e635" }} />
            CANADA-WIDE WILDLIFE RESCUE
          </span>

          <h1
            className="mt-8 text-5xl font-bold leading-[0.95] tracking-tight sm:text-8xl"
            style={{ letterSpacing: "-0.03em" }}
          >
            FOUND A HURT
            <br />
            <span style={{ color: "#a3e635" }}>WILD ANIMAL?</span>
          </h1>
          <p className="mt-7 max-w-xl text-lg leading-8" style={{ color: "#9fc4b3" }}>
            Answer a few questions. We tell you exactly what to do and get the
            animal to the nearest rehabilitation centre. Fast.
          </p>

          <div className="mt-9 flex flex-col gap-3 sm:flex-row">
            <a
              href="#"
              className="inline-flex h-14 items-center justify-center rounded-full px-9 text-lg font-bold text-[#0b1f17] transition-transform hover:scale-[1.02]"
              style={{ background: "#a3e635" }}
            >
              START NOW →
            </a>
            <a
              href="#"
              className="inline-flex h-14 items-center justify-center rounded-full px-9 text-lg font-medium"
              style={{ border: "1px solid #ffffff22", color: "#eafff4" }}
            >
              Emergency basics
            </a>
          </div>
        </div>
      </section>

      {/* Steps */}
      <section className="mx-auto max-w-5xl px-5 pb-24">
        <div className="grid gap-4 sm:grid-cols-3">
          {STEPS.map((s) => (
            <div
              key={s.n}
              className="rounded-3xl p-7"
              style={{ background: "#0f2a1f", border: "1px solid #ffffff12" }}
            >
              <span className="text-3xl font-bold" style={{ color: "#a3e635" }}>
                {s.n}
              </span>
              <p className="mt-4 text-lg font-bold tracking-wide">{s.title}</p>
              <p className="mt-2 text-sm leading-6" style={{ color: "#9fc4b3" }}>
                {s.label}
              </p>
            </div>
          ))}
        </div>
        <p className="mx-auto mt-10 max-w-lg text-center text-sm leading-7" style={{ color: "#6f9384" }}>
          Not every animal that looks alone or hurt needs rescuing. Sometimes the
          kindest thing is to leave it be, and we&apos;ll help you tell the difference.
        </p>
      </section>
    </div>
  );
}
