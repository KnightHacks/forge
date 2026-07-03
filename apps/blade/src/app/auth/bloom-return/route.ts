import { NextResponse } from "next/server";

import { env } from "~/env";

const DEFAULT_BLOOM_RETURN_PATH = "/dashboard";
const ALLOWED_BLOOM_RETURN_ORIGINS = [
  "https://bloom.knighthacks.org",
  "http://localhost:3006",
] as const;

function getBloomReturnURL(returnTo: string | null) {
  const configuredBloomOrigin = new URL(env.BLOOMKNIGHTS_URL).origin;
  const allowedOrigins = new Set([
    configuredBloomOrigin,
    ...ALLOWED_BLOOM_RETURN_ORIGINS,
  ]);
  const defaultReturnURL = new URL(
    DEFAULT_BLOOM_RETURN_PATH,
    configuredBloomOrigin,
  );

  if (!returnTo) return defaultReturnURL;

  try {
    const requestedReturnURL = new URL(returnTo, configuredBloomOrigin);

    if (
      !allowedOrigins.has(requestedReturnURL.origin) ||
      !requestedReturnURL.pathname.startsWith("/")
    ) {
      return defaultReturnURL;
    }

    return requestedReturnURL;
  } catch {
    return defaultReturnURL;
  }
}

export function GET(request: Request) {
  const requestUrl = new URL(request.url);
  const returnTo = getBloomReturnURL(requestUrl.searchParams.get("returnTo"));

  if (requestUrl.searchParams.has("authError")) {
    returnTo.searchParams.set("authError", "oauth");
  }

  return NextResponse.redirect(returnTo);
}
