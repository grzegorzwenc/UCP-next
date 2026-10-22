const AVCOL = ["var(--good)", "var(--review)", "var(--info)", "var(--brand)", "var(--sched)", "var(--color-bdl-red-error)", "var(--ink-3)"];
export const avatarColor = (name: string) => AVCOL[name.split("").reduce((a, c) => a + c.charCodeAt(0), 0) % AVCOL.length];
export const initials = (name: string) => name.split(" ").filter(Boolean).map((w) => w[0]).join("").slice(0, 2).toUpperCase();

/** Initials in a coloured circle; colour is a stable hash of the name (same as the prototype's avatar()). */
export function Avatar({ name, size = 28 }: { name: string; size?: number }) {
  return <span aria-hidden="true" className="inline-grid place-items-center rounded-full text-white font-medium flex-none select-none" style={{ width: size, height: size, background: avatarColor(name), fontSize: Math.round(size * 0.38) }}>{initials(name)}</span>;
}
