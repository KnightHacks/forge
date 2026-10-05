import {
  createHackerPortalContext,
  HackerPortalDomainError,
} from "@forge/api/hacker-portal";

/** The domain error behind a thrown participant failure, if there is one. */
export function participantDomainError(error: unknown) {
  return error instanceof Error &&
    error.cause instanceof HackerPortalDomainError
    ? error.cause
    : error instanceof HackerPortalDomainError
      ? error
      : null;
}

export function errorResponse(
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

export async function authenticatedContext(request: Request) {
  const context = await createHackerPortalContext({ headers: request.headers });
  if (!context.client?.enabled || !context.session) return null;
  return {
    ...context,
    client: context.client,
    session: context.session,
  };
}

export async function readBoundedFormData(request: Request, maxBytes: number) {
  if (!request.body) throw new Error("Upload body is missing.");
  let received = 0;
  const boundedBody = request.body.pipeThrough(
    new TransformStream<Uint8Array, Uint8Array>({
      transform(chunk, controller) {
        received += chunk.byteLength;
        if (received > maxBytes) {
          controller.error(new Error("Upload exceeds the byte limit."));
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
