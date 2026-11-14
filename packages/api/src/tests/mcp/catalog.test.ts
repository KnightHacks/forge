import { describe, expect, it } from "vitest";
import { z } from "zod";

import { createTRPCRouter, permProcedure, publicProcedure } from "../../trpc";
import { buildActionCatalog, getActionCatalog } from "../../utils/mcp/catalog";

const registration = {
  access: { mode: "any", permissions: ["READ_CLUB_DATA"] },
  description: "Read a Club report.",
} as const;

describe("MCP action catalog", () => {
  it("memoizes static catalogs per router and describes zero-input actions", () => {
    const router = createTRPCRouter({
      read: permProcedure.meta({ mcp: registration }).query(() => "read"),
    });
    expect(getActionCatalog(router)).toBe(getActionCatalog(router));
    expect(getActionCatalog(router).get("read")?.inputSchema).toMatchObject({
      type: "object",
      properties: {},
      additionalProperties: false,
    });
  });

  it.each([
    { description: " " },
    { access: { mode: "any", permissions: [] } },
    { access: { mode: "unknown", permissions: ["READ_CLUB_DATA"] } },
    { access: { mode: "any", permissions: ["NOT_A_PERMISSION"] } },
  ])("rejects invalid registration %j", (invalid) => {
    const read = permProcedure
      .meta({ mcp: { ...registration } })
      .query(() => "read");
    Object.assign(read._def, {
      meta: { mcp: { ...registration, ...invalid } },
    });
    expect(() => buildActionCatalog(createTRPCRouter({ read }))).toThrow(
      "Invalid MCP metadata for read",
    );
  });

  it("rejects subscriptions and validators that cannot produce JSON schemas", () => {
    const stream = publicProcedure
      .meta({ mcp: registration })
      .subscription(async function* () {
        yield await Promise.resolve("event");
      });
    expect(() => buildActionCatalog(createTRPCRouter({ stream }))).toThrow(
      "cannot be a subscription",
    );
    for (const input of [
      z.bigint(),
      z.custom(),
      z.map(z.string(), z.string()),
    ]) {
      const read = permProcedure
        .meta({ mcp: registration })
        .input(input)
        .query(({ input }) => input);
      expect(() => buildActionCatalog(createTRPCRouter({ read }))).toThrow(
        "cannot be represented",
      );
    }
    const read = permProcedure
      .meta({ mcp: registration })
      .input((input) => input)
      .query(({ input }) => input);
    expect(() => buildActionCatalog(createTRPCRouter({ read }))).toThrow(
      "must use Zod",
    );
  });

  it("derives transforms from their input and marks native dates for protocol adapters", () => {
    const router = createTRPCRouter({
      read: permProcedure
        .meta({ mcp: registration })
        .input(z.object({ at: z.date(), count: z.string().transform(Number) }))
        .query(({ input }) => input),
    });
    expect(buildActionCatalog(router).get("read")?.inputSchema).toMatchObject({
      properties: {
        at: {
          type: "string",
          format: "date-time",
          "x-forge-native-type": "Date",
        },
        count: { type: "string" },
      },
    });
  });

  it("collects nested opted-in actions and derives their input schema", () => {
    const router = createTRPCRouter({
      reports: createTRPCRouter({
        read: permProcedure
          .meta({ mcp: registration })
          .input(
            z.object({ slug: z.string().min(1), limit: z.number().default(5) }),
          )
          .query(({ input }) => input),
        hidden: publicProcedure.query(() => "hidden"),
      }),
    });
    const catalog = buildActionCatalog(router);
    expect([...catalog.keys()]).toEqual(["reports.read"]);
    expect(catalog.get("reports.read")).toMatchObject({
      path: "reports.read",
      description: "Read a Club report.",
      inputSchema: {
        type: "object",
        properties: {
          slug: { type: "string", minLength: 1 },
          limit: { type: "number", default: 5 },
        },
        required: ["slug"],
      },
    });
  });
});
