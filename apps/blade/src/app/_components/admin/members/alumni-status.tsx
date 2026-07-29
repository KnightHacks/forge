import { Badge } from "@forge/ui/badge";

/**
 * Two separate facts share one gold accent, so keep them distinct:
 *
 * - **Graduated** (`gradDate` in the past) tints the member's own data — the
 *   name they are clicked by, and the graduation date that made it true.
 * - **Alumni confirmed** (`alumniConfirmedAt`) earns the badge.
 *
 * Graduated but unconfirmed is the common case, which is why one signal cannot
 * stand in for the other.
 *
 * An earlier pass drew graduation as a gold row border. It was rejected on
 * sight: on Blade's near-black table a border reads as chrome, competing with
 * the `border-b` every row already has, rather than as a fact about the person.
 * Tinting the data itself says the same thing without adding furniture.
 */

/**
 * The member name is the only way into the detail dialog now that the View
 * button is gone, so the affordance has to be visible at rest rather than on
 * hover — nobody hovers a cell to discover it is clickable.
 *
 * The highlight is an underline plus, for graduates, gold text. It is
 * deliberately **not** `text-primary`: measured against `--background` in dark
 * mode, Blade's purple sits at 2.84:1, well under the 4.5:1 WCAG AA needs for
 * body text. Gold is 10.78:1 and the default foreground is 19.25:1, so both are
 * safe. Purple survives only as the underline colour, where contrast rules do
 * not apply to a 2px rule the way they do to glyphs.
 */
const NAME_AFFORDANCE = "underline decoration-2 underline-offset-4";

/** A current student: readable foreground text under a brand-coloured rule. */
export const nameClassName = `${NAME_AFFORDANCE} decoration-primary/70 hover:decoration-primary`;

/** A graduate: the same affordance, carrying the gold signal at rest. */
export const graduatedNameClassName = `${NAME_AFFORDANCE} text-[hsl(var(--guild-gold))] decoration-[hsl(var(--guild-gold)/0.7)] hover:decoration-[hsl(var(--guild-gold))]`;

/** The graduation date itself, for a member whose date has passed. */
export const graduatedDateClassName = "text-[hsl(var(--guild-gold))]";

export function AlumniBadge() {
  return (
    <Badge
      variant="outline"
      className="shrink-0 border-[hsl(var(--guild-gold)/0.75)] bg-[hsl(var(--guild-gold)/0.12)] text-[hsl(var(--guild-gold))]"
    >
      Alumni
    </Badge>
  );
}
