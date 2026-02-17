import type { TRPCRouterRecord } from "@trpc/server";

import { hackerMutationsRouter } from "./mutations";
import { hackerPaginationRouter } from "./pagination";
import { hackerQueriesRouter } from "./queries";

type HackerRouter = typeof hackerQueriesRouter &
  typeof hackerPaginationRouter &
  typeof hackerMutationsRouter;

export const hackerRouter: HackerRouter = {
  ...hackerQueriesRouter,
  ...hackerPaginationRouter,
  ...hackerMutationsRouter,
};

void (hackerRouter satisfies TRPCRouterRecord);
