import Link from "next/link";

export default function Home() {
  return (
    <main className="flex flex-1 flex-col items-center justify-center gap-8 bg-gradient-to-b from-emerald-50 to-transparent px-5 py-16 text-center">
      <div className="mx-auto flex w-full max-w-2xl flex-col items-center gap-8">
      <div className="flex flex-col items-center gap-4">
        <span aria-hidden className="text-5xl">🐦</span>
        <h1 className="text-3xl font-semibold leading-tight tracking-tight sm:text-4xl">
          Found an injured or orphaned wild animal?
        </h1>
        <p className="max-w-md text-lg leading-8 text-zinc-600">
          Answer a few quick questions and WildAssist will tell you what to do —
          whether to leave it alone, how to keep it safe, and where to get help.
        </p>
      </div>

      <div className="flex flex-col items-center gap-3">
        <Link
          href="/triage"
          className="inline-flex h-14 items-center justify-center rounded-full bg-emerald-700 px-8 text-lg font-medium text-white shadow-sm transition-colors hover:bg-emerald-800"
        >
          Get help now
        </Link>
        <Link
          href="/emergency"
          className="text-sm font-medium text-emerald-700 underline underline-offset-4 hover:text-emerald-900"
        >
          Or see emergency basics
        </Link>
      </div>

      <div className="mt-4 grid w-full gap-3 text-left sm:grid-cols-3">
        {[
          { icon: "1", label: "Tell us what you found" },
          { icon: "2", label: "Describe the situation" },
          { icon: "3", label: "Get clear next steps" },
        ].map((step) => (
          <div
            key={step.icon}
            className="rounded-xl border border-black/5 bg-white p-4"
          >
            <div className="flex h-7 w-7 items-center justify-center rounded-full bg-emerald-100 text-sm font-semibold text-emerald-800">
              {step.icon}
            </div>
            <p className="mt-2 text-sm text-zinc-700">{step.label}</p>
          </div>
        ))}
      </div>

      <p className="max-w-md text-sm leading-6 text-zinc-500">
        Not every animal that looks alone or hurt actually needs rescuing.
        Sometimes the best thing you can do is leave it be — we&apos;ll help you tell
        the difference.
      </p>
      </div>
    </main>
  );
}
