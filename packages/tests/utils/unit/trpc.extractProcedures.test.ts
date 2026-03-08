import type { AnyTRPCRouter } from "@trpc/server";
import { describe, expect, it } from "vitest";
import { z } from "zod";

import { trpc } from "@forge/utils";

describe("extractProcedures", () => {
  it("should extract procedures with meta", () => {
    // Create a mock router structure
    const mockRouter = {
      _def: {
        procedures: {
          testProcedure: {
            _def: {
              meta: {
                id: "test-proc-id",
                inputSchema: z.object({
                  field1: z.string(),
                  field2: z.number(),
                }),
              },
            },
          },
          anotherProcedure: {
            _def: {
              meta: {
                id: "another-proc-id",
                inputSchema: z.object({
                  field3: z.boolean(),
                }),
              },
            },
          },
          procedureWithoutMeta: {
            _def: {
              meta: null,
            },
          },
        },
      },
    } as unknown as AnyTRPCRouter;

    const result = trpc.extractProcedures(mockRouter);

    expect(result).toEqual({
      "test-proc-id": {
        inputSchema: ["field1", "field2"],
        route: "testProcedure",
      },
      "another-proc-id": {
        inputSchema: ["field3"],
        route: "anotherProcedure",
      },
    });
  });

  it("should skip procedures without meta", () => {
    const mockRouter = {
      _def: {
        procedures: {
          procedureWithoutMeta: {
            _def: {
              meta: null,
            },
          },
          procedureWithInvalidMeta: {
            _def: {
              meta: {
                // Missing id or inputSchema
                someOtherField: "value",
              },
            },
          },
        },
      },
    } as unknown as AnyTRPCRouter;

    const result = trpc.extractProcedures(mockRouter);

    expect(result).toEqual({});
  });

  it("should handle empty router", () => {
    const mockRouter = {
      _def: {
        procedures: {},
      },
    } as unknown as AnyTRPCRouter;

    const result = trpc.extractProcedures(mockRouter);

    expect(result).toEqual({});
  });

  it("should extract input schema keys correctly", () => {
    const mockRouter = {
      _def: {
        procedures: {
          complexProcedure: {
            _def: {
              meta: {
                id: "complex-proc",
                inputSchema: z.object({
                  name: z.string(),
                  age: z.number(),
                  email: z.string().email(),
                  optional: z.string().optional(),
                }),
              },
            },
          },
        },
      },
    } as unknown as AnyTRPCRouter;

    const result = trpc.extractProcedures(mockRouter);

    expect(result["complex-proc"]?.inputSchema).toEqual([
      "name",
      "age",
      "email",
      "optional",
    ]);
  });
});
