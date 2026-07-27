import { Readable } from "node:stream";
import { NextResponse } from "next/server";

import { createMemberResumeBundle } from "@forge/api/resume-bundle.server";
import { logger } from "@forge/utils";

import { canAccessAnalytics } from "~/app/_components/admin/access";
import { auth } from "~/server/auth";
import { api } from "~/trpc/server";

export const runtime = "nodejs";

const DOWNLOAD_COOKIE = "resume-bundle-download";
const DOWNLOAD_TOKEN_PATTERN = /^[A-Za-z0-9_-]{16,128}$/;

function getDownloadToken(request?: Request) {
  if (!request) return null;
  const token = new URL(request.url).searchParams.get("downloadToken");
  return token && DOWNLOAD_TOKEN_PATTERN.test(token) ? token : null;
}

function withDownloadSignal(
  response: Response,
  request: Request | undefined,
  status: "ready" | "error",
) {
  const token = getDownloadToken(request);
  if (!token || !request) return response;

  const secure = new URL(request.url).protocol === "https:" ? "; Secure" : "";
  response.headers.append(
    "Set-Cookie",
    `${DOWNLOAD_COOKIE}=${token}.${status}; Path=/; Max-Age=300; SameSite=Lax${secure}`,
  );
  return response;
}

export async function GET(request?: Request) {
  const session = await auth();
  if (!session) {
    return withDownloadSignal(
      NextResponse.json({ error: "Unauthorized" }, { status: 401 }),
      request,
      "error",
    );
  }

  const permissions = await api.roles.getPermissions();
  if (!canAccessAnalytics(permissions)) {
    return withDownloadSignal(
      NextResponse.json({ error: "Forbidden" }, { status: 403 }),
      request,
      "error",
    );
  }

  try {
    const bundle = await createMemberResumeBundle({ actor: session.user });
    const stream = Readable.toWeb(bundle.stream) as ReadableStream<Uint8Array>;
    return withDownloadSignal(
      new Response(stream, {
        headers: {
          "Cache-Control": "private, no-store",
          "Content-Disposition": `attachment; filename="${bundle.fileName}"`,
          "Content-Type": "application/zip",
          "X-Content-Type-Options": "nosniff",
        },
      }),
      request,
      "ready",
    );
  } catch {
    logger.error("Member resume bundle generation failed.");
    return withDownloadSignal(
      NextResponse.json(
        { error: "The member resume bundle could not be prepared." },
        { status: 500 },
      ),
      request,
      "error",
    );
  }
}
