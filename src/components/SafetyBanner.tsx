import { AlertTriangle } from "lucide-react";
import type { DangerInfo } from "@/lib/safety";

/** Prominent, always-on safety warning for animals that shouldn't be handled. */
export default function SafetyBanner({ danger }: { danger: DangerInfo }) {
  return (
    <div className="rounded-2xl border-2 border-rose-300 bg-rose-50 p-5">
      <div className="flex items-start gap-3">
        <AlertTriangle className="h-6 w-6 shrink-0 text-rose-700" aria-hidden />
        <div>
          <p className="font-display text-lg font-semibold text-rose-900">
            {danger.label}
          </p>
          <p className="mt-1 text-sm leading-6 text-rose-950">{danger.reason}</p>
          <ul className="mt-3 flex flex-col gap-1.5 text-sm text-rose-950">
            <li className="flex gap-2">
              <span aria-hidden>•</span>
              <span>Stay back and keep pets and children away.</span>
            </li>
            <li className="flex gap-2">
              <span aria-hidden>•</span>
              <span>Do not try to pick it up, feed it, or trap it yourself.</span>
            </li>
            <li className="flex gap-2">
              <span aria-hidden>•</span>
              <span>Call a licensed wildlife rehabilitator for advice before doing anything.</span>
            </li>
            {danger.rabiesVector && (
              <li className="flex gap-2">
                <span aria-hidden>•</span>
                <span>
                  If a person or pet may have touched or been bitten or scratched,
                  contact your local public health unit right away.
                </span>
              </li>
            )}
          </ul>
        </div>
      </div>
    </div>
  );
}
