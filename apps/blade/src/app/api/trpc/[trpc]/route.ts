import { fetchRequestHandler } from "@trpc/server/adapters/fetch";

import { appRouter, createTRPCContext } from "@forge/api";
import { auth } from "@forge/auth";

/**
 * Configure basic CORS headers
 * You should extend this to match your needs
 */
const setCorsHeaders = (res: Response) => {
  res.headers.set("Access-Control-Allow-Origin", "*");
  res.headers.set("Access-Control-Request-Method", "*");
  res.headers.set("Access-Control-Allow-Methods", "OPTIONS, GET, POST");
  res.headers.set("Access-Control-Allow-Headers", "*");
};

export const OPTIONS = () => {
  const response = new Response(null, {
    status: 204,
  });
  setCorsHeaders(response);
  return response;
};

const handler = async (req: Request) => {
  const contentLength = req.headers.get("content-length");
  const maxSize = 4_194_304; // 4MB in bytes

  if (contentLength && parseInt(contentLength) > maxSize) {
    const response = new Response(
      JSON.stringify({
        error: {
          message: `Request too large: ${(parseInt(contentLength) / 1_000_000).toFixed(2)}MB (max: ${(maxSize / 1_000_000).toFixed(2)}MB)`,
          code: -32000,
          data: {
            code: "PAYLOAD_TOO_LARGE",
            httpStatus: 413,
          },
        },
      }),
      {
        status: 413,
        headers: {
          "Content-Type": "application/json",
        },
      },
    );
    setCorsHeaders(response);
    return response;
  }

  const session = await auth();
  const response = await fetchRequestHandler({
    endpoint: "/api/trpc",
    router: appRouter,
    req,
    createContext: () =>
      createTRPCContext({
        session: session,
        headers: req.headers,
      }),
    onError({ error, path }) {
      // eslint-disable-next-line no-console
      console.error(`>>> tRPC Error on '${path}'`, error);
    },
  });
  setCorsHeaders(response);
  return response;
};

export { handler as GET, handler as POST };
