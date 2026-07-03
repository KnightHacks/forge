export type ParticipantPortalPath =
  | "/apply"
  | "/dashboard"
  | "/dashboard/profile";

export function buildParticipantPortalUrl(
  portalBaseUrl: string | null | undefined,
  path: ParticipantPortalPath,
) {
  if (!portalBaseUrl) return null;

  try {
    const baseUrl = new URL(portalBaseUrl);
    if (baseUrl.protocol !== "http:" && baseUrl.protocol !== "https:") {
      return null;
    }
    if (
      baseUrl.username ||
      baseUrl.password ||
      baseUrl.pathname !== "/" ||
      baseUrl.search ||
      baseUrl.hash
    ) {
      return null;
    }
    return new URL(path, baseUrl).toString();
  } catch {
    return null;
  }
}
