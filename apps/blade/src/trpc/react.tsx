"use client";

import type { QueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { QueryClientProvider } from "@tanstack/react-query";
import {
  httpSubscriptionLink,
  retryLink,
  splitLink,
  unstable_httpBatchStreamLink,
} from "@trpc/client";
import { createTRPCReact } from "@trpc/react-query";
import SuperJSON from "superjson";

import type { AppRouter } from "@forge/api";

import { env } from "~/env";
import { createQueryClient } from "./query-client";

let clientQueryClientSingleton: QueryClient | undefined = undefined;

const getQueryClient = () => {
  if (typeof window === "undefined") return createQueryClient();

  return (clientQueryClientSingleton ??= createQueryClient());
};

export const api = createTRPCReact<AppRouter>();

export function TRPCReactProvider(props: { children: React.ReactNode }) {
  const queryClient = getQueryClient();

  const [trpcClient] = useState(() =>
    api.createClient({
      links: [
        splitLink({
          condition: (operation) => operation.type === "subscription",
          true: [
            retryLink({
              retryDelayMs: (attempt) =>
                Math.min(1000 * 2 ** (attempt - 1), 30_000),
              retry: ({ error }) =>
                !["UNAUTHORIZED", "FORBIDDEN", "NOT_FOUND"].includes(
                  error.data?.code ?? "",
                ),
            }),
            httpSubscriptionLink({
              transformer: SuperJSON,
              url: getBaseUrl() + "/api/trpc",
            }),
          ],
          false: unstable_httpBatchStreamLink({
            transformer: SuperJSON,
            url: getBaseUrl() + "/api/trpc",
            headers() {
              const headers = new Headers();
              headers.set("x-trpc-source", "nextjs-react");
              return headers;
            },
          }),
        }),
      ],
    }),
  );

  return (
    <QueryClientProvider client={queryClient}>
      <api.Provider client={trpcClient} queryClient={queryClient}>
        {props.children}
      </api.Provider>
    </QueryClientProvider>
  );
}

const getBaseUrl = () => {
  if (typeof window !== "undefined") return window.location.origin;

  return `http://localhost:${env.PORT}`;
};
