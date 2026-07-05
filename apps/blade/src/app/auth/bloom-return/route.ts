import { NextResponse } from "next/server";

import { env } from "~/env";

const DEFAULT_BLOOM_RETURN_PATH = "/dashboard";
const PRODUCTION_BLOOM_RETURN_ORIGIN = "https://bloom.knighthacks.org";
const LOCAL_BLOOM_RETURN_ORIGIN = "http://localhost:3006";

function getAllowedBloomReturnOrigins(configuredBloomOrigin: string) {
  const allowedOrigins = new Set([
    configuredBloomOrigin,
    PRODUCTION_BLOOM_RETURN_ORIGIN,
  ]);

  if (env.NODE_ENV !== "production") {
    allowedOrigins.add(LOCAL_BLOOM_RETURN_ORIGIN);
  }

  return allowedOrigins;
}

function getBloomReturnURL(returnTo: string | null) {
  const configuredBloomOrigin = new URL(env.BLOOMKNIGHTS_URL).origin;
  const allowedOrigins = getAllowedBloomReturnOrigins(configuredBloomOrigin);
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
