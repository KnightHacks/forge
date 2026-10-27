import { fetchRequestHandler } from "@trpc/server/adapters/fetch";

import {
  caseStudiesRouter,
  createProjectsContext,
} from "@forge/api/case-studies";
import { readBoundedRequestBody } from "@forge/auth/server";

const MAX_REQUEST_BYTES = 1_048_576;

const handler = async (request: Request) => {
  let boundedRequest = request;
  try {
    if (request.method === "POST") {
      const body = await readBoundedRequestBody(request, MAX_REQUEST_BYTES);
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
          message: "Projects request is too large.",
        },
      },
      { status: 413, headers: { "cache-control": "private, no-store" } },
    );
  }
  const response = await fetchRequestHandler({
    createContext: () =>
      createProjectsContext({ headers: boundedRequest.headers }),
    endpoint: "/api/projects/v1/trpc",
    req: boundedRequest,
    router: caseStudiesRouter,
  });
  response.headers.set("cache-control", "private, no-store");
  response.headers.set("pragma", "no-cache");
  return response;
};

export { handler as GET, handler as POST };
