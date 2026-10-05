import {
  requirePrintUploadAccess,
  uploadPrintFile,
} from "@forge/api/hacker-portal";
import { PRINT_FILE_UPLOAD_POLICY } from "@forge/validators";

import {
  authenticatedContext,
  errorResponse,
  participantDomainError,
  readBoundedFormData,
} from "../../participant-upload";

/** One file plus multipart framing. */
const MAX_BODY_BYTES = PRINT_FILE_UPLOAD_POLICY.maxBytes + 1024 * 1024;

function participantError(error: unknown, requestId: string) {
  const cause = participantDomainError(error);
  if (!cause) {
    return errorResponse(
      "INVALID_PRINT_FILE",
      "The print file could not be uploaded.",
      400,
      requestId,
    );
  }
  const status =
    cause.code === "FORBIDDEN" || cause.code === "FORBIDDEN_STATUS"
      ? 403
      : cause.code === "PRINT_STORAGE_LIMIT" ||
          cause.code === "PRINT_UPLOAD_BUSY"
        ? 429
        : 400;
  return errorResponse(cause.code, cause.message, status, requestId);
}

export async function POST(
  request: Request,
  context: { params: Promise<{ operation: string }> },
) {
  const { operation } = await context.params;
  if (operation !== "upload") {
    return errorResponse("FORBIDDEN", "Unknown printing operation.", 404);
  }
  const portal = await authenticatedContext(request);
  if (!portal) {
    return errorResponse(
      "SESSION_EXPIRED",
      "The participant session has expired.",
      401,
    );
  }
  const contentLength = Number(request.headers.get("content-length") ?? 0);
  if (contentLength > MAX_BODY_BYTES) {
    return errorResponse(
      "INVALID_PRINT_FILE",
      `Print file must be ${PRINT_FILE_UPLOAD_POLICY.sizeLabel} or smaller.`,
      413,
      portal.requestId,
    );
  }
  try {
    await requirePrintUploadAccess(portal);
    const form = await readBoundedFormData(request, MAX_BODY_BYTES);
    const file = form.get("file");
    if (!(file instanceof File)) {
      return errorResponse(
        "INVALID_PRINT_FILE",
        "Choose a file to upload.",
        400,
        portal.requestId,
      );
    }
    const result = await uploadPrintFile(portal, {
      bytes: new Uint8Array(await file.arrayBuffer()),
      contentType: file.type,
      fileName: file.name,
    });
    return Response.json(result, {
      headers: { "cache-control": "private, no-store" },
    });
  } catch (error) {
    return participantError(error, portal.requestId);
  }
}

/** Authenticate the SDK proxy before it buffers any file bytes. */
export async function HEAD(
  request: Request,
  context: { params: Promise<{ operation: string }> },
) {
  if ((await context.params).operation !== "upload")
    return new Response(null, { status: 404 });
  const portal = await authenticatedContext(request);
  if (!portal)
    return new Response(null, {
      status: 401,
      headers: { "cache-control": "private, no-store" },
    });
  try {
    await requirePrintUploadAccess(portal);
    return new Response(null, {
      status: 204,
      headers: { "cache-control": "private, no-store" },
    });
  } catch {
    return new Response(null, {
      status: 403,
      headers: { "cache-control": "private, no-store" },
    });
  }
}
