/**
 * String presenters for the admin form builder: the slug the stable link is
 * built from, the `datetime-local` values the availability inputs read, the
 * share-dialog href, and the labels on the configuration summary badges.
 */

type FormResponseMode = "multiple_locked" | "single_editable" | "single_locked";

/**
 * The stable link segment for a form title. Accents are folded rather than
 * dropped, every other run of non-alphanumerics collapses to a single dash, and
 * the result is trimmed to the 80 characters the slug column accepts.
 */
export function toSlug(value: string) {
  return value
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 80);
}

/**
 * An instant as the `YYYY-MM-DDTHH:mm` string a `datetime-local` input expects,
 * shifted into the viewer's own zone so the value they see matches their clock.
 * A missing timestamp becomes the empty string, which is how the input renders
 * "no date chosen".
 */
export function localDateTime(value: string | null) {
  if (!value) return "";
  const date = new Date(value);
  const offset = date.getTimezoneOffset() * 60_000;
  return new Date(date.getTime() - offset).toISOString().slice(0, 16);
}

/**
 * The builder URL with the share dialog opened or closed. Sharing lives in the
 * query string so the dialog survives a refresh and can be linked to directly;
 * every other query param the page is carrying is preserved.
 */
export function formBuilderShareHref(
  pathname: string,
  currentSearch: string,
  open: boolean,
) {
  const next = new URLSearchParams(currentSearch);
  if (open) next.set("dialog", "share");
  else next.delete("dialog");
  const query = next.toString();
  return query ? `${pathname}?${query}` : pathname;
}

/**
 * The section badge label. A form can point at a section the current user
 * cannot see, or at none at all while it is being created, so the lookup falls
 * back rather than rendering an empty badge.
 */
export function formatSectionName(
  sections: { id: string; name: string }[],
  sectionId: string,
) {
  return (
    sections.find((section) => section.id === sectionId)?.name ?? "No section"
  );
}

/** How many responses a respondent may leave, and whether they may edit them. */
export function formatResponseMode(responseMode: FormResponseMode) {
  return responseMode === "single_locked"
    ? "One locked response"
    : responseMode === "single_editable"
      ? "One editable response"
      : "Multiple locked responses";
}

/**
 * Who may respond. No selected roles is not an empty audience — it means every
 * eligible member holding the link, which is the opposite of what "0 roles"
 * would read as.
 */
export function formatRespondentAudience(respondentRoleIds: string[]) {
  return respondentRoleIds.length === 0
    ? "All eligible members"
    : `${respondentRoleIds.length} respondent roles`;
}
