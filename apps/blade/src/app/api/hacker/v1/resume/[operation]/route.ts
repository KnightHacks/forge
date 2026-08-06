import { Readable } from "node:stream";

import {
  createHackerPortalContext,
  HackerPortalDomainError,
  openResumeDownload,
  uploadResume,
} from "@forge/api/hacker-portal";

function participantError(error: unknown, requestId: string) {
  const cause =
    error instanceof Error && error.cause instanceof HackerPortalDomainError
      ? error.cause
      : error instanceof HackerPortalDomainError
        ? error
        : null;
  if (!cause) {
    return errorResponse(
      "INVALID_RESUME",
      "The resume operation could not be completed.",
      400,
      requestId,
    );
  }
  const status =
    cause.code === "CONFLICT"
      ? 409
      : cause.code === "APPLICATION_LOCKED"
        ? 412
        : cause.code === "FORBIDDEN"
          ? 403
          : 400;
  return errorResponse(cause.code, cause.message, status, requestId);
}

function errorResponse(
  code: string,
  message: string,
  status: number,
  requestId?: string,
) {
  return Response.json(
    {
      error: {
        code,
        message,
        requestId: requestId ?? crypto.randomUUID(),
        retryable: false,
      },
    },
    {
      headers: { "cache-control": "private, no-store" },
      status,
    },
  );
}

async function authenticatedContext(request: Request) {
  const context = await createHackerPortalContext({ headers: request.headers });
  if (!context.client?.enabled || !context.session) return null;
  return {
    ...context,
    client: context.client,
    session: context.session,
  };
}

async function readBoundedFormData(request: Request, maxBytes: number) {
  if (!request.body) throw new Error("Resume upload body is missing.");
  let received = 0;
  const boundedBody = request.body.pipeThrough(
    new TransformStream<Uint8Array, Uint8Array>({
      transform(chunk, controller) {
        received += chunk.byteLength;
        if (received > maxBytes) {
          controller.error(new Error("Resume upload exceeds the byte limit."));
          return;
        }
        controller.enqueue(chunk);
      },
    }),
  );
  const init: RequestInit & { duplex?: "half" } = {
    body: boundedBody,
    headers: request.headers,
    method: "POST",
    duplex: "half",
  };
  return new Request(request.url, init).formData();
}

export async function GET(
  request: Request,
  context: { params: Promise<{ operation: string }> },
) {
  const { operation } = await context.params;
  if (operation !== "download") {
    return errorResponse("FORBIDDEN", "Unknown resume operation.", 404);
  }
  const portal = await authenticatedContext(request);
  if (!portal) {
    return errorResponse(
      "SESSION_EXPIRED",
      "The participant session has expired.",
      401,
    );
  }
  try {
    const download = await openResumeDownload(portal);
    return new Response(
      Readable.toWeb(download.stream) as ReadableStream<Uint8Array>,
      {
        headers: {
          "cache-control": "private, no-store",
          "content-disposition": 'inline; filename="Resume.pdf"',
          "content-length": String(download.size),
          "content-type": "application/pdf",
        },
      },
    );
  } catch (error) {
    return participantError(error, portal.requestId);
  }
}

export async function POST(
  request: Request,
  context: { params: Promise<{ operation: string }> },
) {
  const { operation } = await context.params;
  if (operation !== "upload") {
    return errorResponse("FORBIDDEN", "Unknown resume operation.", 404);
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
  if (contentLength > 5_200_000) {
    return errorResponse(
      "INVALID_RESUME",
      "The resume exceeds 5 MB.",
      413,
      portal.requestId,
    );
  }
  try {
    const form = await readBoundedFormData(request, 5_200_000);
    const file = form.get("file");
    const idempotencyKey = form.get("idempotencyKey");
    if (!(file instanceof File)) {
      return errorResponse(
        "INVALID_RESUME",
        "Choose a PDF resume.",
        400,
        portal.requestId,
      );
    }
    if (
      typeof idempotencyKey !== "string" ||
      idempotencyKey.length === 0 ||
      idempotencyKey.length > 128
    ) {
      return errorResponse(
        "CONFLICT",
        "A valid idempotency key is required.",
        400,
        portal.requestId,
      );
    }
    const result = await uploadResume(portal, {
      bytes: new Uint8Array(await file.arrayBuffer()),
      contentType: file.type,
      fileName: file.name,
      idempotencyKey,
    });
    return Response.json(result, {
      headers: { "cache-control": "private, no-store" },
    });
  } catch (error) {
    return participantError(error, portal.requestId);
  }
}
