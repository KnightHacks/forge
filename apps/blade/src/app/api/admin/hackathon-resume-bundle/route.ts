import { Readable } from "node:stream";
import { NextResponse } from "next/server";
import { TRPCError } from "@trpc/server";

import { createHackathonResumeBundle } from "@forge/api/resume-bundle.server";
import { logger } from "@forge/utils";
import { resumeBundlePartInputSchema } from "@forge/validators";

import { auth } from "~/server/auth";
import { api } from "~/trpc/server";

export const runtime = "nodejs";

export async function GET(request: Request) {
  const session = await auth();
  if (!session)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const permissions = await api.roles.getPermissions();
  if (permissions.IS_OFFICER !== true) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  const url = new URL(request.url);
  const parsed = resumeBundlePartInputSchema.safeParse({
    currentStatuses: url.searchParams.getAll("status"),
    hackathonId: url.searchParams.get("hackathonId"),
    policyAcknowledged: url.searchParams.get("policyAcknowledged") === "true",
    policyVersion: url.searchParams.get("policyVersion"),
    partNumber: Number(url.searchParams.get("partNumber")),
    planFingerprint: url.searchParams.get("planFingerprint"),
    pool: url.searchParams.get("pool"),
    scope: "hackathon",
  });
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid resume bundle request." },
      { status: 400 },
    );
  }
  if (parsed.data.scope !== "hackathon") {
    return NextResponse.json(
      { error: "Invalid resume bundle request." },
      { status: 400 },
    );
  }
  try {
    const bundle = await createHackathonResumeBundle({
      actor: session.user,
      currentStatuses: parsed.data.currentStatuses,
      hackathonId: parsed.data.hackathonId,
      partNumber: parsed.data.partNumber,
      planFingerprint: parsed.data.planFingerprint,
      policyAcknowledged: true,
      policyVersion: parsed.data.policyVersion,
      pool: parsed.data.pool,
    });
    return new Response(
      Readable.toWeb(bundle.stream) as ReadableStream<Uint8Array>,
      {
        headers: {
          "Cache-Control": "private, no-store",
          "Content-Disposition": `attachment; filename="${bundle.fileName}"`,
          "Content-Type": "application/zip",
          "X-Content-Type-Options": "nosniff",
        },
      },
    );
  } catch (error) {
    logger.error("Hackathon resume bundle generation failed.");
    if (error instanceof TRPCError && error.code === "NOT_FOUND") {
      return NextResponse.json(
        { error: "Hackathon not found." },
        { status: 404 },
      );
    }
    return NextResponse.json(
      { error: "The recruiter resume bundle could not be prepared." },
      { status: 500 },
    );
  }
}
