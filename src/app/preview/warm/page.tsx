import { Fraunces } from "next/font/google";
import PreviewNav from "../PreviewNav";

const fraunces = Fraunces({ subsets: ["latin"], weight: ["400", "600", "700"] });

const STEPS = [
  { icon: "📸", title: "Show us", label: "Snap a photo or pick the animal you found." },
  { icon: "💬", title: "Tell the story", label: "Describe what's happening and where." },
  { icon: "🌿", title: "Get a plan", label: "Kind, clear steps and the nearest centre." },
];

export default function WarmPreview() {
  return (
    <div className="min-h-screen" style={{ background: "#f7f4ec" }}>
      <PreviewNav active="Warm" />

      {/* Hero */}
      <section className="relative overflow-hidden">
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0"
          style={{
            background:
              "radial-gradient(120% 80% at 50% -10%, #dcead1 0%, transparent 60%)",
          }}
        />
        <div className="relative mx-auto flex max-w-3xl flex-col items-center px-5 py-24 text-center">
          <span
            className="inline-flex items-center gap-2 rounded-full px-4 py-1.5 text-sm font-medium"
            style={{ background: "#e8f0dc", color: "#3f6212" }}
          >
            🐾 Every animal deserves a second chance
          </span>

          <h1
            className={`${fraunces.className} mt-6 text-4xl leading-[1.08] sm:text-6xl`}
            style={{ color: "#2c3b23", fontWeight: 600 }}
          >
            Found a wild animal in need? We&apos;ll guide you through it.
          </h1>
          <p
            className="mx-auto mt-6 max-w-xl text-lg leading-8"
            style={{ color: "#5b6650" }}
          >
            Take a breath. Answer a few gentle questions and WildAssist will help
            you do right by the animal, and connect it to caring hands nearby.
          </p>

          <div className="mt-9 flex flex-col items-center gap-3 sm:flex-row">
            <a
              href="#"
              className="inline-flex h-14 items-center justify-center rounded-full px-9 text-lg font-medium text-white shadow-lg transition-transform hover:scale-[1.02]"
              style={{ background: "#4d7c0f", boxShadow: "0 10px 30px -8px #4d7c0f66" }}
            >
              Start helping
            </a>
            <a
              href="#"
              className="inline-flex h-14 items-center justify-center rounded-full border px-9 text-lg font-medium"
              style={{ borderColor: "#c9d3b8", color: "#3f6212", background: "#ffffff99" }}
            >
              Emergency basics
            </a>
          </div>
        </div>
      </section>

      {/* Steps */}
      <section className="mx-auto max-w-4xl px-5 pb-24">
        <div className="grid gap-5 sm:grid-cols-3">
          {STEPS.map((s) => (
            <div
              key={s.title}
              className="rounded-3xl border bg-white p-7 text-center shadow-sm"
              style={{ borderColor: "#eae4d5" }}
            >
              <div
                className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl text-2xl"
                style={{ background: "#eef3e3" }}
              >
                {s.icon}
              </div>
              <p
                className={`${fraunces.className} mt-4 text-xl`}
                style={{ color: "#2c3b23", fontWeight: 600 }}
              >
                {s.title}
              </p>
              <p className="mt-2 text-sm leading-6" style={{ color: "#6b7360" }}>
                {s.label}
              </p>
            </div>
          ))}
        </div>
        <p className="mx-auto mt-10 max-w-lg text-center text-sm leading-7" style={{ color: "#8a9078" }}>
          Not every animal that looks alone or hurt needs rescuing. Sometimes the
          kindest thing is to leave it be, and we&apos;ll help you tell the difference.
        </p>
      </section>
    </div>
  );
}
