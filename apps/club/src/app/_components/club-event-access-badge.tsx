export function ClubEventAccessBadge({
  requiresDues,
}: {
  requiresDues: boolean;
}) {
  if (!requiresDues) return null;

  return (
    <span
      aria-label="Dues required event"
      className="border-[var(--club-gold)]/45 bg-[var(--club-gold)]/15 inline-flex min-h-7 items-center rounded-full border px-2.5 text-[11px] font-black uppercase text-[var(--club-gold)]"
    >
      Dues required
    </span>
  );
}
