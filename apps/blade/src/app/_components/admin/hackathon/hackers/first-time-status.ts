export type FirstTimeStatus = "first" | "returning" | "unknown";

/**
 * Compatibility reader for the profile-to-attendee first-time migration.
 *
 * New API DTOs expose the resolved per-hackathon status. Older DTOs expose the
 * nullable profile boolean. Keeping that fallback here lets the UI distinguish
 * an unanswered value from Returning throughout the cutover.
 */
export function resolveFirstTimeStatus(value: {
  firstTimeStatus?: FirstTimeStatus | null;
  isFirstTime?: boolean | null;
}): FirstTimeStatus {
  if (value.firstTimeStatus) return value.firstTimeStatus;
  if (value.isFirstTime === true) return "first";
  if (value.isFirstTime === false) return "returning";
  return "unknown";
}

export function firstTimeStatusLabel(status: FirstTimeStatus) {
  if (status === "first") return "First-time hacker";
  if (status === "returning") return "Returning";
  return "Not recorded";
}
