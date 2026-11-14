import type { AnyRouter, TRPC_ERROR_CODE_KEY } from "@trpc/server";
import { getTRPCErrorFromUnknown, TRPCError } from "@trpc/server";

import type { Session } from "@forge/auth/server";

import type { McpAction } from "./catalog";
import { createTRPCContext } from "../../trpc";
import { loadPermissionsForUser } from "../permissions-db";
import { assertAccess, evaluateAccess } from "./access";
import { getActionCatalog } from "./catalog";

/** Safe activity-writer seam: never includes input, results, session or tokens. */
export interface McpToolCallEvent {
  actorUserId: string | null;
  errorCode: TRPC_ERROR_CODE_KEY | null;
  outcome: "allowed" | "denied" | "failed";
  path: string;
}

export interface McpCallOptions {
  onToolCall?: (event: McpToolCallEvent) => void | Promise<void>;
}

export type McpActionSummary = Pick<McpAction, "description" | "path">;
export type McpActionDescription = Pick<
  McpAction,
  "description" | "inputSchema" | "path"
>;

export interface ActionGateway {
  callAction(
    session: Session | null,
    path: string,
    input: unknown,
    options?: McpCallOptions,
  ): Promise<unknown>;
  describeAction(
    session: Session | null,
    path: string,
  ): Promise<McpActionDescription>;
  searchActions(
    session: Session | null,
    query: string,
  ): Promise<McpActionSummary[]>;
}

/** Create a gateway for a normal Forge router; only static metadata is cached. */
export function createActionGateway(router: AnyRouter): ActionGateway {
  const catalog = getActionCatalog(router);
  return {
    /** Run native tRPC input, including Date values, through the server caller. */
    async callAction(
      session: Session | null,
      path: string,
      input: unknown,
      options: McpCallOptions = {},
    ) {
      let result: unknown;
      let error: TRPCError | undefined;
      try {
        if (!session?.user) throw new TRPCError({ code: "UNAUTHORIZED" });
        const permissions = await loadPermissionsForUser(session.user.id);
        const action = catalog.get(path);
        if (!action) throw new TRPCError({ code: "NOT_FOUND" });
        assertAccess(action.access, permissions);
        const caller = router.createCaller(
          createTRPCContext({
            session,
            headers: new Headers({ "x-trpc-source": "mcp" }),
          }),
        );
        const call = caller[path];
        if (typeof call !== "function")
          throw new TRPCError({ code: "NOT_FOUND" });
        result = await call(input);
      } catch (cause) {
        error = getTRPCErrorFromUnknown(cause);
      }
      try {
        await options.onToolCall?.({
          actorUserId: session?.user.id ?? null,
          errorCode: error?.code ?? null,
          outcome: !error
            ? "allowed"
            : ["FORBIDDEN", "UNAUTHORIZED", "NOT_FOUND"].includes(error.code)
              ? "denied"
              : "failed",
          path,
        });
      } catch (cause) {
        // A writer failure must not replace an existing procedure error. On
        // success it propagates; the procedure may already have committed.
        if (!error) throw cause;
      }
      if (error) throw error;
      return result;
    },
    /** Known but disallowed actions return FORBIDDEN, matching normal tRPC. */
    async describeAction(session: Session | null, path: string) {
      if (!session?.user) throw new TRPCError({ code: "UNAUTHORIZED" });
      const permissions = await loadPermissionsForUser(session.user.id);
      const action = catalog.get(path);
      if (!action) throw new TRPCError({ code: "NOT_FOUND" });
      assertAccess(action.access, permissions);
      return {
        path: action.path,
        description: action.description,
        inputSchema: action.inputSchema,
      };
    },
    async searchActions(session: Session | null, query: string) {
      if (!session?.user) throw new TRPCError({ code: "UNAUTHORIZED" });
      const permissions = await loadPermissionsForUser(session.user.id);
      const terms = query.trim().toLowerCase().split(/\s+/).filter(Boolean);
      return [...catalog.values()]
        .filter((action) => evaluateAccess(action.access, permissions))
        .map((action) => {
          const path = action.path.toLowerCase();
          const description = action.description.toLowerCase();
          const matches = terms.map((term) =>
            path.includes(term) ? 2 : description.includes(term) ? 1 : 0,
          );
          return {
            action,
            matches,
            score: matches.reduce<number>((sum, score) => sum + score, 0),
          };
        })
        .filter(({ matches }) => matches.every((score) => score > 0))
        .sort(
          (a, b) =>
            b.score - a.score || a.action.path.localeCompare(b.action.path),
        )
        .map(({ action }) => ({
          path: action.path,
          description: action.description,
        }));
    },
  };
}

let defaultGateway: Promise<ActionGateway> | undefined;
function getDefaultGateway() {
  defaultGateway ??= import("../../root").then(({ appRouter }) =>
    createActionGateway(appRouter),
  );
  return defaultGateway;
}

/** Empty/whitespace query returns every action the current permissions allow. */
export async function searchActions(
  session: Session | null,
  query: string,
): Promise<McpActionSummary[]> {
  return (await getDefaultGateway()).searchActions(session, query);
}

export async function describeAction(
  session: Session | null,
  path: string,
): Promise<McpActionDescription> {
  return (await getDefaultGateway()).describeAction(session, path);
}

/** Protocol adapters must supply validated sessions and native tRPC input. */
export async function callAction(
  session: Session | null,
  path: string,
  input: unknown,
  options?: McpCallOptions,
) {
  return (await getDefaultGateway()).callAction(session, path, input, options);
}
