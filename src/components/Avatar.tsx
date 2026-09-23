/** Presentational avatar: shows a photo if present, else colored initials. */

export const AVATAR_COLORS = [
  "#047857", // emerald
  "#2563eb", // blue
  "#7c3aed", // violet
  "#db2777", // pink
  "#ea580c", // orange
  "#0d9488", // teal
  "#475569", // slate
];

export function initialOf(value?: string | null): string {
  const c = (value ?? "").trim().charAt(0).toUpperCase();
  return c || "?";
}

export default function Avatar({
  url,
  name,
  email,
  color,
  size = 40,
}: {
  url?: string | null;
  name?: string | null;
  email?: string | null;
  color?: string | null;
  size?: number;
}) {
  const dims = { width: size, height: size };

  if (url) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={url}
        alt="Profile photo"
        style={dims}
        className="rounded-full object-cover"
      />
    );
  }

  return (
    <span
      style={{
        ...dims,
        backgroundColor: color || AVATAR_COLORS[0],
        fontSize: Math.round(size * 0.42),
      }}
      className="inline-flex shrink-0 items-center justify-center rounded-full font-semibold text-white"
    >
      {initialOf(name || email)}
    </span>
  );
}
