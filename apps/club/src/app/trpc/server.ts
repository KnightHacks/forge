import { createTRPCClient, httpBatchLink } from "@trpc/client";
import superjson from "superjson";

import type { AppRouter } from "@forge/api";

import { env } from "~/env";

export const api = createTRPCClient<AppRouter>({
  links: [
    httpBatchLink({
      transformer: superjson,
      url: `${env.BLADE_URL}/api/trpc`,
    }),
  ],
});
