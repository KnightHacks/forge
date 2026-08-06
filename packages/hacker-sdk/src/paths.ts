export const DEFAULT_HACKER_SDK_ADAPTER_PATH = "/api/hacker-sdk";

export function normalizeHackerSdkBasePath(value: string) {
  const withLeadingSlash = value.startsWith("/") ? value : `/${value}`;
  return withLeadingSlash === "/"
    ? withLeadingSlash
    : withLeadingSlash.replace(/\/+$/, "");
}

function safeReturnTo(value: string | null | undefined) {
  if (!value || !value.startsWith("/") || value.startsWith("//")) return "/";
  try {
    const parsed = new URL(value, "https://portal.invalid");
    return parsed.origin === "https://portal.invalid"
      ? `${parsed.pathname}${parsed.search}${parsed.hash}`
      : "/";
  } catch {
    return "/";
  }
}

export function getHackerSdkSignInPath(
  returnTo = "/",
  adapterBasePath = DEFAULT_HACKER_SDK_ADAPTER_PATH,
) {
  const params = new URLSearchParams({ returnTo: safeReturnTo(returnTo) });
  return `${normalizeHackerSdkBasePath(adapterBasePath)}/sign-in?${params.toString()}`;
}

export function getHackerSdkSignOutPath(
  adapterBasePath = DEFAULT_HACKER_SDK_ADAPTER_PATH,
) {
  return `${normalizeHackerSdkBasePath(adapterBasePath)}/sign-out`;
}

export { safeReturnTo as normalizeHackerSdkReturnPath };
