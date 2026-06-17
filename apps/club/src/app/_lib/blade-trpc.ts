import type { AppRouter } from "@forge/api";
import { createTRPCProxyClient, httpBatchLink } from "@trpc/client";
import SuperJSON from "superjson";

const trpcClients = new Map<
  string,
  ReturnType<typeof createTRPCProxyClient<AppRouter>>
>();

function getBladeTrpcUrl(bladeUrl: string) {
  return new URL("/api/trpc", bladeUrl).toString();
}

export function getBladeTrpcClient(bladeUrl: string) {
  const trpcUrl = getBladeTrpcUrl(bladeUrl);
  const cachedClient = trpcClients.get(trpcUrl);

  if (cachedClient) return cachedClient;

  const client = createTRPCProxyClient<AppRouter>({
    links: [
      httpBatchLink({
        url: trpcUrl,
        headers: {
          "x-trpc-source": "club-site",
        },
        transformer: SuperJSON,
      }),
    ],
  });

  trpcClients.set(trpcUrl, client);

  return client;
}
