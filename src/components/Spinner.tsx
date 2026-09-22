export default function Spinner({ label }: { label?: string }) {
  return (
    <span className="inline-flex items-center gap-2">
      <span
        aria-hidden
        className="h-4 w-4 animate-spin rounded-full border-2 border-white/40 border-t-white"
      />
      {label && <span>{label}</span>}
    </span>
  );
}
