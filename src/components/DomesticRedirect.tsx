import Link from "next/link";

/**
 * Shown when someone lands on the triage flow with a pet or a domestic dog/cat.
 * WildAssist is for wild animals; a domestic animal needs a vet or animal
 * control, not a wildlife rehabilitator, so we redirect rather than triage.
 */
export default function DomesticRedirect({ onBack }: { onBack: () => void }) {
  return (
    <div className="animate-in flex flex-col gap-5">
      <div>
        <p className="text-xs font-medium uppercase tracking-widest text-stone-500">
          Not a wild animal
        </p>
        <h1 className="mt-2 font-display text-2xl font-semibold tracking-tight text-stone-900">
          This sounds like a pet
        </h1>
        <p className="mt-1.5 leading-7 text-stone-600">
          WildAssist helps with <span className="font-medium">wild</span>{" "}
          animals. A dog, cat, or other pet needs different help, and a wildlife
          rehabilitator can&apos;t take a domestic animal. Here&apos;s who to
          contact.
        </p>
      </div>

      <div className="rounded-2xl border border-stone-200 bg-white p-5 shadow-sm">
        <h2 className="font-display text-lg font-semibold text-stone-900">
          A sick or injured pet
        </h2>
        <p className="mt-1 text-sm leading-6 text-stone-600">
          Call your veterinarian. If it&apos;s urgent or after hours, go to the
          nearest 24-hour emergency animal hospital. Keep the animal warm and
          calm on the way.
        </p>
      </div>

      <div className="rounded-2xl border border-stone-200 bg-white p-5 shadow-sm">
        <h2 className="font-display text-lg font-semibold text-stone-900">
          A stray, lost, or loose dog or cat
        </h2>
        <p className="mt-1 text-sm leading-6 text-stone-600">
          Contact your local animal control or humane society / SPCA. In many
          areas you can reach them through 311 or your city&apos;s non-emergency
          line. Don&apos;t chase or corner a frightened animal, and don&apos;t
          put yourself at risk of a bite.
        </p>
      </div>

      <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm leading-6 text-amber-900">
        Is it actually wildlife, like a fox, coyote, or bobcat? Those can look
        like a dog or cat from a distance. Go back and pick it from the list.
      </div>

      <div className="flex flex-wrap gap-3 pt-1">
        <button
          onClick={onBack}
          className="inline-flex h-11 items-center justify-center rounded-xl bg-stone-900 px-6 text-sm font-semibold text-white transition-colors hover:bg-stone-800"
        >
          It is a wild animal
        </button>
        <Link
          href="/"
          className="inline-flex h-11 items-center justify-center rounded-xl border border-stone-200 bg-white px-6 text-sm font-semibold text-stone-700 transition-colors hover:bg-stone-50"
        >
          Home
        </Link>
      </div>
    </div>
  );
}
