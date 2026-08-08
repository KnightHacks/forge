import { createHackerSdkNextHandler } from "@forge/hacker-sdk/next";

import { env } from "~/env";

const handler = createHackerSdkNextHandler({
  bladeOrigin: env.BLADE_URL,
  clientId: env.KHIX_HACKER_PORTAL_CLIENT_ID,
  portalOrigin: env.KHIX_HACKER_PORTAL_ORIGIN,
});

interface RouteContext {
  params: Promise<{ hackerSdk: string[] }>;
}

export function GET(request: Request, context: RouteContext) {
  return handler(request, context);
}

export function POST(request: Request, context: RouteContext) {
  return handler(request, context);
}

export function DELETE(request: Request, context: RouteContext) {
  return handler(request, context);
}
