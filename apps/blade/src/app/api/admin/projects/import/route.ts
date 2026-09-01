import { NextResponse } from "next/server";

import {
  importDevpostProjects,
  PROJECT_IMPORT_MAX_BYTES,
  ProjectImportError,
} from "@forge/api/projects-import.server";
import { logger } from "@forge/utils";
import { projectHackathonIdSchema } from "@forge/validators";

import { canAccessProjectAdmin } from "~/lib/admin-access";
import { auth } from "~/server/auth";
import { api } from "~/trpc/server";

export const runtime = "nodejs";

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
  if (declaredLength > PROJECT_IMPORT_MAX_BYTES + 1_000_000) {
    return response({ error: "The CSV must be 25 MiB or smaller." }, 413);
  }

  let form: FormData;
  try {
    form = await request.formData();
  } catch {
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
    logger.error("Devpost project import failed.");
    return response(
      { error: "The project import could not be completed." },
      500,
    );
  }
}
