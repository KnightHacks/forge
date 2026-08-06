import { portalRefreshSchema } from "@forge/validators";

import {
  portalAuthErrorResponse,
  portalSessionService,
  readJson,
} from "../shared";

export async function POST(request: Request) {
  try {
    const body = portalRefreshSchema.parse(await readJson(request));
    const tokens = await portalSessionService.refresh(
      body.refreshToken,
      body.clientId,
    );
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
