import Link from "next/link";

const STYLES = [
  { href: "/", label: "Clean (live)" },
  { href: "/preview/warm", label: "Warm" },
  { href: "/preview/bold", label: "Bold" },
];

/** Small floating switcher so you can flip between the design directions. */
export default function PreviewNav({ active }: { active: string }) {
  return (
    <div className="fixed bottom-4 left-1/2 z-50 flex -translate-x-1/2 items-center gap-1 rounded-full border border-black/10 bg-white/90 p-1 shadow-lg backdrop-blur">
      <span className="px-2 text-xs font-medium text-zinc-400">Preview:</span>
      {STYLES.map((s) => (
        <Link
          key={s.href}
          href={s.href}
          className={`rounded-full px-3 py-1.5 text-xs font-semibold transition-colors ${
            active === s.label
              ? "bg-zinc-900 text-white"
              : "text-zinc-600 hover:bg-zinc-100"
          }`}
        >
          {s.label}
        </Link>
      ))}
    </div>
  );
}
