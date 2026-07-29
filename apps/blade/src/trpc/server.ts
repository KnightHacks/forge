import { cache } from "react";
import { headers } from "next/headers";
import { createHydrationHelpers } from "@trpc/react-query/rsc";

import type { AppRouter } from "@forge/api";
import { createCaller, createTRPCContext } from "@forge/api";

import { auth } from "~/server/auth";
import { createQueryClient } from "./query-client";

const createContext = cache(async () => {
  const heads = new Headers(await headers());
  heads.set("x-trpc-source", "rsc");

  return createTRPCContext({
    session: await auth(),
    headers: heads,
  });
});

const getQueryClient = cache(createQueryClient);
const caller = createCaller(createContext);

// `HydrateClient` is deliberately not re-exported. It only does anything when a
// page seeds the query cache with `.prefetch()`, which Blade never did — all 25
// wrappers dehydrated an empty cache. Pages read on the server and pass props
// down, so there is nothing to hydrate.
export const { trpc: api } = createHydrationHelpers<AppRouter>(
  caller,
  getQueryClient,
);
