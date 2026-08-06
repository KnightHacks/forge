import { portalRevokeSchema } from "@forge/validators";

import {
  portalAuthErrorResponse,
  portalSessionService,
  readJson,
} from "../shared";

export async function POST(request: Request) {
  try {
    const body = portalRevokeSchema.parse(await readJson(request));
    const accessHeader = request.headers.get("authorization");
    const accessToken = accessHeader?.replace(/^Bearer\s+/i, "");
    if (!accessToken && !body.refreshToken) {
      throw new Error("Portal revoke requires a credential.");
    }
    await portalSessionService.revoke(body.clientId, {
      accessToken,
      refreshToken: body.refreshToken,
    });
    return new Response(null, {
      status: 204,
      headers: { "cache-control": "private, no-store" },
    });
  } catch (error) {
    return portalAuthErrorResponse(error);
  }
}
