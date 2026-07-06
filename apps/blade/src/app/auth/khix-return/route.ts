import { NextResponse } from "next/server";

import { env } from "~/env";

const DEFAULT_KHIX_RETURN_PATH = "/dashboard";
const PRODUCTION_KHIX_RETURN_ORIGIN = "https://2026.knighthacks.org";
const LOCAL_KHIX_RETURN_ORIGIN = "http://localhost:3007";

function getAllowedKhixReturnOrigins(configuredKhixOrigin: string) {
  const allowedOrigins = new Set([
    configuredKhixOrigin,
    PRODUCTION_KHIX_RETURN_ORIGIN,
  ]);

  if (env.NODE_ENV !== "production") {
    allowedOrigins.add(LOCAL_KHIX_RETURN_ORIGIN);
  }

  return allowedOrigins;
}

function getKhixReturnURL(returnTo: string | null) {
  const configuredKhixOrigin = new URL(env.KHIX_URL).origin;
  const allowedOrigins = getAllowedKhixReturnOrigins(configuredKhixOrigin);
  const defaultReturnURL = new URL(
    DEFAULT_KHIX_RETURN_PATH,
    configuredKhixOrigin,
  );

  if (!returnTo) return defaultReturnURL;

  try {
    const requestedReturnURL = new URL(returnTo, configuredKhixOrigin);

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
  const returnTo = getKhixReturnURL(requestUrl.searchParams.get("returnTo"));

  if (requestUrl.searchParams.has("authError")) {
    returnTo.searchParams.set("authError", "oauth");
  }

  return NextResponse.redirect(returnTo);
}
