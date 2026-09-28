/** Skeleton shown while the analytics server component re-renders (range/filter
 *  changes trigger a server round-trip). Keeps the page from feeling frozen. */
export default function AnalyticsLoading() {
  return (
    <main className="mx-auto flex w-full max-w-4xl flex-1 flex-col px-5 py-8">
      <div className="mb-5 flex items-start justify-between gap-3">
        <div>
          <div className="h-3 w-20 animate-pulse rounded bg-zinc-100" />
          <div className="mt-2 h-7 w-32 animate-pulse rounded bg-zinc-200" />
        </div>
        <div className="h-9 w-40 animate-pulse rounded-xl bg-zinc-100" />
      </div>

      <div className="mb-6 h-10 w-56 animate-pulse rounded-xl bg-zinc-100" />

      <div className="flex flex-col gap-5">
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div
              key={i}
              className="h-20 animate-pulse rounded-2xl border border-zinc-200 bg-white"
            />
          ))}
        </div>
        <div className="h-28 animate-pulse rounded-2xl border border-zinc-200 bg-white" />
        <div className="grid gap-5 sm:grid-cols-2">
          <div className="h-32 animate-pulse rounded-2xl border border-zinc-200 bg-white" />
          <div className="h-32 animate-pulse rounded-2xl border border-zinc-200 bg-white" />
        </div>
        <div className="h-48 animate-pulse rounded-2xl border border-zinc-200 bg-white" />
      </div>
    </main>
  );
}
