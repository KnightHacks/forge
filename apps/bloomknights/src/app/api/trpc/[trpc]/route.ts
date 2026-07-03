import { fetchRequestHandler } from "@trpc/server/adapters/fetch";

import { createTRPCContext, participantRouter } from "@forge/api/participant";

import { validateToken } from "~/auth/server";

const MAX_REQUEST_SIZE = 8 * 1024 * 1024;

const handler = async (req: Request) => {
  const contentLength = Number(req.headers.get("content-length") ?? 0);
  if (contentLength > MAX_REQUEST_SIZE) {
    return Response.json(
      { error: { message: "Request exceeds the 8MB upload limit." } },
      { status: 413 },
    );
  }

  const session = await validateToken();
  return fetchRequestHandler({
    endpoint: "/api/trpc",
    router: participantRouter,
    req,
    createContext: () => createTRPCContext({ headers: req.headers, session }),
    onError({ error, path }) {
      // eslint-disable-next-line no-console
      console.error(`Bloom tRPC error on ${path ?? "unknown"}:`, error.message);
    },
  });
};

export { handler as GET, handler as POST };
