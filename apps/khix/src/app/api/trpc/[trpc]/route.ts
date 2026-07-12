import { fetchRequestHandler } from "@trpc/server/adapters/fetch";

import { createTRPCContext, participantRouter } from "@forge/api/participant";

import { validateToken } from "~/auth/server";

const MAX_REQUEST_SIZE = 8 * 1024 * 1024;

function requestTooLargeResponse() {
  return Response.json(
    { error: { message: "Request exceeds the 8MB upload limit." } },
    { status: 413 },
  );
}

function concatChunks(chunks: Uint8Array[], totalLength: number) {
  if (chunks.length === 0) return undefined;

  const body = new ArrayBuffer(totalLength);
  const bytes = new Uint8Array(body);
  let offset = 0;
  for (const chunk of chunks) {
    bytes.set(chunk, offset);
    offset += chunk.byteLength;
  }
  return body;
}

async function readRequestWithLimit(req: Request) {
  if (req.method === "GET" || req.method === "HEAD" || !req.body) return req;

  const reader = req.body.getReader();
  const chunks: Uint8Array[] = [];
  let totalLength = 0;

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    totalLength += value.byteLength;
    if (totalLength > MAX_REQUEST_SIZE) {
      await reader.cancel();
      return null;
    }

    chunks.push(value);
  }

  return new Request(req.url, {
    body: concatChunks(chunks, totalLength),
    headers: req.headers,
    method: req.method,
    signal: req.signal,
  });
}

const handler = async (req: Request) => {
  const contentLength = Number(req.headers.get("content-length") ?? 0);
  if (contentLength > MAX_REQUEST_SIZE) {
    return requestTooLargeResponse();
  }

  const limitedRequest = await readRequestWithLimit(req);
  if (!limitedRequest) return requestTooLargeResponse();

  const session = await validateToken();
  return fetchRequestHandler({
    endpoint: "/api/trpc",
    router: participantRouter,
    req: limitedRequest,
    createContext: () =>
      createTRPCContext({ headers: limitedRequest.headers, session }),
    onError({ error, path }) {
      // eslint-disable-next-line no-console
      console.error(`KHIX tRPC error on ${path ?? "unknown"}:`, error.message);
    },
  });
};

export { handler as GET, handler as POST };
