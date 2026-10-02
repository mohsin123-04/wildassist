"use client";

import { useEffect, useRef, useState } from "react";
import { Check, ChevronDown } from "lucide-react";

export type SelectOption = { value: string; label: string };

/**
 * App-wide dropdown that renders identically on mobile and desktop. Native
 * <select> hands the option list to the OS (an ugly full-screen picker on
 * phones, a plain box on desktop) and can't be styled — this draws its own
 * popover so every dropdown in the app matches the flat, warm UI.
 */
export default function Select({
  value,
  onChange,
  options,
  ariaLabel,
  placeholder = "Select…",
  className = "",
  align = "left",
  size = "md",
  disabled = false,
}: {
  value: string;
  onChange: (value: string) => void;
  options: SelectOption[];
  ariaLabel?: string;
  placeholder?: string;
  className?: string;
  align?: "left" | "right";
  size?: "sm" | "md";
  disabled?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const selected = options.find((o) => o.value === value);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  const h = size === "sm" ? "h-9" : "h-10";

  return (
    <div ref={rootRef} className={`relative ${className}`}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        disabled={disabled}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-label={ariaLabel}
        className={`inline-flex ${h} w-full items-center justify-between gap-2 rounded-xl border border-stone-200 bg-white px-3 text-sm transition-colors hover:bg-stone-50 focus:outline-none focus:ring-4 focus:ring-stone-900/5 disabled:opacity-50`}
      >
        <span className={`truncate ${selected ? "text-stone-800" : "text-stone-400"}`}>
          {selected ? selected.label : placeholder}
        </span>
        <ChevronDown
          className={`h-4 w-4 shrink-0 text-stone-400 transition-transform ${open ? "rotate-180" : ""}`}
          aria-hidden
        />
      </button>

      {open && (
        <>
          <div
            className="fixed inset-0 z-20"
            aria-hidden
            onClick={() => setOpen(false)}
          />
          <ul
            role="listbox"
            className={`absolute z-30 mt-1.5 max-h-64 min-w-full overflow-auto rounded-xl border border-stone-200 bg-white p-1 shadow-lg shadow-stone-900/10 ${
              align === "right" ? "right-0" : "left-0"
            }`}
          >
            {options.map((o) => {
              const isSel = o.value === value;
              return (
                <li key={o.value} role="option" aria-selected={isSel}>
                  <button
                    type="button"
                    onClick={() => {
                      onChange(o.value);
                      setOpen(false);
                    }}
                    className={`flex w-full items-center justify-between gap-3 whitespace-nowrap rounded-lg px-3 py-2 text-left text-sm transition-colors ${
                      isSel
                        ? "bg-forest-900/[0.06] font-medium text-forest-900"
                        : "text-stone-700 hover:bg-stone-900/[0.04]"
                    }`}
                  >
                    <span className="truncate">{o.label}</span>
                    {isSel && (
                      <Check className="h-4 w-4 shrink-0 text-forest-900" aria-hidden />
                    )}
                  </button>
                </li>
              );
            })}
          </ul>
        </>
      )}
    </div>
  );
}
