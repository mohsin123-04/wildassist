import { Check, Phone } from "lucide-react";

type AssignedCentre = {
  id: string;
  name: string;
  town: string;
  phone?: string | null;
  website?: string | null;
};

/** Confirmation shown after a report is routed to a centre. */
export default function ReportStatus({ centre }: { centre: AssignedCentre }) {
  return (
    <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-6">
      <div className="flex items-center gap-2">
        <span
          aria-hidden
          className="flex h-7 w-7 items-center justify-center rounded-xl bg-emerald-600 text-white"
        >
          <Check className="h-4 w-4" />
        </span>
        <p className="font-display text-lg font-semibold text-emerald-900">
          Report sent to a centre
        </p>
      </div>
      <p className="mt-2 leading-7 text-zinc-900">
        Based on your location, this report was routed to{" "}
        <span className="font-semibold">{centre.name}</span> in {centre.town}.
        Their staff can see it on their dashboard.
      </p>

      <div className="mt-4 flex flex-wrap gap-2.5">
        {centre.phone && (
          <a
            href={`tel:${centre.phone.replace(/[^0-9+]/g, "")}`}
            className="inline-flex h-11 items-center justify-center gap-1.5 rounded-xl bg-emerald-600 px-6 font-medium text-white shadow-sm transition-colors hover:bg-emerald-700"
          >
            <Phone className="h-4 w-4" aria-hidden /> Call {centre.phone}
          </a>
        )}
        {centre.website && (
          <a
            href={centre.website}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex h-11 items-center justify-center rounded-full border border-emerald-300 bg-white px-6 font-medium text-emerald-800 transition-colors hover:bg-emerald-100"
          >
            Visit website
          </a>
        )}
      </div>

      <p className="mt-4 text-sm leading-6 text-emerald-800/80">
        For an urgent, life-threatening situation, please call the centre right
        away rather than waiting for them to see the report.
      </p>
    </div>
  );
}
