import { fetchRequestHandler } from "@trpc/server/adapters/fetch";

import {
  createHackerPortalContext,
  hackerParticipantV1Router,
} from "@forge/api/hacker-portal";
import { readBoundedRequestBody } from "@forge/auth/server";

const MAX_PARTICIPANT_REQUEST_BYTES = 1_048_576;

const handler = async (request: Request) => {
  let boundedRequest = request;
  try {
    if (request.method !== "GET" && request.method !== "HEAD") {
      const body = await readBoundedRequestBody(
        request,
        MAX_PARTICIPANT_REQUEST_BYTES,
      );
      const init: RequestInit & { duplex?: "half" } = {
        body,
        headers: request.headers,
        method: request.method,
        signal: request.signal,
      };
      if (body.byteLength > 0) init.duplex = "half";
      boundedRequest = new Request(request.url, init);
    }
  } catch {
    return Response.json(
      {
        error: {
          code: "BAD_REQUEST",
          message: "Participant request is too large.",
        },
      },
      { status: 413 },
    );
  }
  const response = await fetchRequestHandler({
    createContext: () =>
      createHackerPortalContext({ headers: boundedRequest.headers }),
    endpoint: "/api/hacker/v1/trpc",
    onError({ error, path }) {
      // eslint-disable-next-line no-console
      console.error(
        `Hacker participant tRPC error on '${path}'`,
        error.message,
      );
    },
    req: boundedRequest,
    router: hackerParticipantV1Router,
  });
  response.headers.set("cache-control", "private, no-store");
  response.headers.set("pragma", "no-cache");
  return response;
};

export { handler as GET, handler as POST };
