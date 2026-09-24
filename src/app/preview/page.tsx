import Link from "next/link";

const OPTIONS = [
  {
    href: "/",
    name: "Clean & modern SaaS",
    desc: "Currently live. White, neutral, one accent, all-sans. Polished and corporate.",
    swatch: ["#ffffff", "#09090b", "#059669"],
  },
  {
    href: "/preview/colors",
    name: "Color playground",
    desc: "The clean layout with a live accent-color switcher. Try emerald, teal, ocean, terracotta, and more.",
    swatch: ["#0d9488", "#2563eb", "#c2410c"],
  },
  {
    href: "/preview/warm",
    name: "Warm & trustworthy nonprofit",
    desc: "Softer, earthy, serif headings. Feels like a caring wildlife charity.",
    swatch: ["#f7f4ec", "#2c3b23", "#4d7c0f"],
  },
  {
    href: "/preview/bold",
    name: "Bold & distinctive",
    desc: "Dark, high-contrast, big type, vibrant lime accent. Memorable and striking.",
    swatch: ["#0b1f17", "#a3e635", "#16c47f"],
  },
];

export default function PreviewIndex() {
  return (
    <main className="mx-auto flex w-full max-w-2xl flex-1 flex-col px-5 py-12">
      <h1 className="font-display text-2xl font-semibold tracking-tight text-zinc-900">
        Compare design directions
      </h1>
      <p className="mt-1 text-zinc-600">
        Open each to see the landing in that style. Use the switcher at the
        bottom to flip between them.
      </p>

      <div className="mt-6 flex flex-col gap-3">
        {OPTIONS.map((o) => (
          <Link
            key={o.href}
            href={o.href}
            className="flex items-center gap-4 rounded-2xl border border-zinc-200 bg-white p-4 transition-colors hover:border-zinc-300 hover:bg-zinc-50"
          >
            <div className="flex gap-1">
              {o.swatch.map((c) => (
                <span
                  key={c}
                  className="h-9 w-5 rounded-md border border-black/10"
                  style={{ background: c }}
                />
              ))}
            </div>
            <div className="min-w-0">
              <p className="font-medium text-zinc-900">{o.name}</p>
              <p className="text-sm text-zinc-500">{o.desc}</p>
            </div>
            <span aria-hidden className="ml-auto text-zinc-300">
              →
            </span>
          </Link>
        ))}
      </div>
    </main>
  );
}
