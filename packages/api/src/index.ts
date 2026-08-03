import type { inferRouterInputs, inferRouterOutputs } from "@trpc/server";

import type { AppRouter } from "./root";
import { appRouter } from "./root";
import { createCallerFactory, createTRPCContext } from "./trpc";

const createCaller: typeof appRouter.createCaller =
  createCallerFactory(appRouter);

type RouterInputs = inferRouterInputs<AppRouter>;
type RouterOutputs = inferRouterOutputs<AppRouter>;

export { appRouter, createCaller, createTRPCContext };
export type { AppRouter, RouterInputs, RouterOutputs };
/*
  Exported so Blade's skipped-list can type its label map against the union
  rather than `string`. A new reason then fails the build instead of rendering
  its raw slug to an officer.
*/
export type { SkipReason } from "./routers/hacker";
