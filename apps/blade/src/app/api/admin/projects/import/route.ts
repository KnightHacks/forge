import { NextResponse } from "next/server";
import { TRPCError } from "@trpc/server";

import {
  importDevpostProjects,
  PROJECT_IMPORT_MAX_BYTES,
  ProjectImportError,
} from "@forge/api/projects-import.server";
import { logger } from "@forge/utils";
import { projectHackathonIdSchema } from "@forge/validators";

import { canAccessProjectAdmin } from "~/lib/admin-access";
import {
  RequestBodyTooLargeError,
  requestWithLimitedBody,
} from "~/lib/limited-request-body";
import { auth } from "~/server/auth";
import { api } from "~/trpc/server";

export const runtime = "nodejs";

const MAX_MULTIPART_BYTES = PROJECT_IMPORT_MAX_BYTES + 1_000_000;

function response(body: object, status: number) {
  return NextResponse.json(body, {
    headers: {
      "Cache-Control": "private, no-store",
      "X-Content-Type-Options": "nosniff",
    },
    status,
  });
}

export async function POST(request: Request) {
  const session = await auth();
  if (!session) return response({ error: "Unauthorized" }, 401);

  const permissions = await api.roles.getPermissions();
  if (!canAccessProjectAdmin(permissions)) {
    return response({ error: "Forbidden" }, 403);
  }

  const declaredLength = Number(request.headers.get("content-length") ?? 0);
  if (declaredLength > MAX_MULTIPART_BYTES) {
    return response({ error: "The CSV must be 25 MiB or smaller." }, 413);
  }

  let form: FormData;
  try {
    const limitedRequest = await requestWithLimitedBody(
      request,
      MAX_MULTIPART_BYTES,
    );
    form = await limitedRequest.formData();
  } catch (error) {
    if (error instanceof RequestBodyTooLargeError) {
      return response({ error: "The CSV must be 25 MiB or smaller." }, 413);
    }
    return response({ error: "The multipart upload could not be read." }, 400);
  }
  const file = form.get("file");
  const parsedHackathon = projectHackathonIdSchema.safeParse({
    hackathonId: form.get("hackathonId"),
  });
  if (!(file instanceof File) || !parsedHackathon.success) {
    return response({ error: "A CSV file and hackathon are required." }, 400);
  }
  if (file.size > PROJECT_IMPORT_MAX_BYTES) {
    return response({ error: "The CSV must be 25 MiB or smaller." }, 413);
  }
  if (!file.name.toLowerCase().endsWith(".csv")) {
    return response({ error: "Upload a Devpost CSV file." }, 400);
  }

  try {
    const result = await importDevpostProjects({
      actor: session.user,
      csvContent: await file.text(),
      fileSize: file.size,
      hackathonId: parsedHackathon.data.hackathonId,
    });
    return response(result, 200);
  } catch (error) {
    if (error instanceof ProjectImportError) {
      return response({ error: error.message }, 400);
    }
    if (error instanceof TRPCError && error.code === "NOT_FOUND") {
      return response({ error: "Hackathon not found." }, 404);
    }
    logger.error("Devpost project import failed.");
    return response(
      { error: "The project import could not be completed." },
      500,
    );
  }
}
