import { Bird, Fish, Turtle, PawPrint, HelpCircle } from "lucide-react";

/** Custom frog icon, drawn in the lucide line style (lucide has no frog). */
function Frog({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.8}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden
    >
      <path d="M3 13c0-4 4-7 9-7s9 3 9 7c0 3-2.5 5-6 5H9c-3.5 0-6-2-6-5Z" />
      <circle cx="8.5" cy="7.8" r="1.5" />
      <circle cx="15.5" cy="7.8" r="1.5" />
      <path d="M9.5 14c.8.7 1.6 1 2.5 1s1.7-.3 2.5-1" />
      <path d="M6 18l-1.5 2M18 18l1.5 2" />
    </svg>
  );
}

const ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  bird: Bird,
  mammal: PawPrint,
  reptile: Turtle,
  amphibian: Frog,
  fish: Fish,
  unsure: HelpCircle,
};

export default function AnimalIcon({
  name,
  className,
}: {
  name: string;
  className?: string;
}) {
  const Icon = ICONS[name] ?? HelpCircle;
  return <Icon className={className} />;
}
