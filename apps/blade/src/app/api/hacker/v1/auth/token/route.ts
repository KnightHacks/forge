import { portalAuthorizationExchangeSchema } from "@forge/validators";

import {
  portalAuthErrorResponse,
  portalSessionService,
  readJson,
} from "../shared";

export async function POST(request: Request) {
  try {
    const body = portalAuthorizationExchangeSchema.parse(
      await readJson(request),
    );
    const tokens = await portalSessionService.exchangeAuthorizationCode({
      clientId: body.clientId,
      code: body.code,
      redirectUri: body.redirectUri,
      pkceVerifier: body.codeVerifier,
    });
    return Response.json(
      {
        accessToken: tokens.accessToken,
        accessTokenExpiresIn: Math.max(
          0,
          Math.floor(
            (tokens.accessTokenExpiresAt.getTime() - Date.now()) / 1000,
          ),
        ),
        refreshToken: tokens.refreshToken,
        refreshTokenExpiresIn: Math.max(
          0,
          Math.floor(
            (tokens.refreshTokenExpiresAt.getTime() - Date.now()) / 1000,
          ),
        ),
      },
      { headers: { "cache-control": "private, no-store" } },
    );
  } catch (error) {
    return portalAuthErrorResponse(error);
  }
}
