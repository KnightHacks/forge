import type { TRPCRouterRecord } from "@trpc/server";
import { TRPCError } from "@trpc/server";
import { z } from "zod";

import { HACKATHONS } from "@forge/consts";
import { and, count, desc, eq, getTableColumns, lt } from "@forge/db";
import { db } from "@forge/db/client";
import {
  Hackathon,
  Hacker,
  HackerAttendee,
} from "@forge/db/schemas/knight-hacks";
import { permissions } from "@forge/utils";

import { permProcedure, protectedProcedure, publicProcedure } from "../trpc";

const hackathonMutationInput = z.object({
  name: z
    .string()
    .trim()
    .toLowerCase()
    .min(2, "Route name must be at least 2 characters.")
    .max(64, "Route name must be 64 characters or fewer.")
    .regex(
      /^[a-z0-9][a-z0-9-]*[a-z0-9]$/,
      "Use lowercase letters, numbers, and hyphens. Start and end with a letter or number.",
    ),
  displayName: z.string().trim().min(1).max(255),
  theme: z.string().trim().min(1).max(255),
  applicationBackgroundEnabled: z.boolean().default(false),
  applicationBackgroundKey: z
    .enum(HACKATHONS.APPLICATION_BACKGROUND_KEYS)
    .nullable()
    .optional(),
  applicationOpen: z.coerce.date(),
  applicationDeadline: z.coerce.date(),
  confirmationDeadline: z.coerce.date(),
  startDate: z.coerce.date(),
  endDate: z.coerce.date(),
});

function assertValidDateWindow(input: z.infer<typeof hackathonMutationInput>) {
  const dates = [
    ["application open", input.applicationOpen],
    ["application deadline", input.applicationDeadline],
    ["confirmation deadline", input.confirmationDeadline],
    ["start date", input.startDate],
    ["end date", input.endDate],
  ] as const;

  for (const [label, date] of dates) {
    if (!Number.isFinite(date.getTime())) {
      throw new TRPCError({
        code: "BAD_REQUEST",
        message: `Invalid ${label}.`,
      });
    }
  }

  if (input.applicationOpen >= input.applicationDeadline) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: "Application open must be before the application deadline.",
    });
  }

  if (input.applicationDeadline > input.confirmationDeadline) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message:
        "Confirmation deadline must be on or after the application deadline.",
    });
  }

  if (input.confirmationDeadline > input.startDate) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: "Confirmation deadline must be on or before the start date.",
    });
  }

  if (input.startDate >= input.endDate) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: "Start date must be before the end date.",
    });
  }
}

function getHackathonMutationValues(
  input: z.infer<typeof hackathonMutationInput>,
) {
  assertValidDateWindow(input);

  if (input.applicationBackgroundEnabled && !input.applicationBackgroundKey) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: "Choose a background preset or disable the background override.",
    });
  }

  return {
    name: input.name,
    displayName: input.displayName,
    theme: input.theme,
    applicationBackgroundEnabled: input.applicationBackgroundEnabled,
    applicationBackgroundKey: input.applicationBackgroundEnabled
      ? input.applicationBackgroundKey
      : null,
    applicationOpen: input.applicationOpen,
    applicationDeadline: input.applicationDeadline,
    confirmationDeadline: input.confirmationDeadline,
    startDate: input.startDate,
    endDate: input.endDate,
  };
}

export const hackathonRouter = {
  getHackathons: publicProcedure.query(async () => {
    return await db.query.Hackathon.findMany();
  }),

  getManagedHackathons: permProcedure.query(async ({ ctx }) => {
    permissions.controlPerms.or(["IS_OFFICER"], ctx);

    return await db.query.Hackathon.findMany({
      orderBy: (t, { desc }) => desc(t.startDate),
    });
  }),

  getCurrentHackathon: publicProcedure.query(async () => {
    // Find first hackathon that hasnt ended yet
    const hackathon = await db.query.Hackathon.findFirst({
      orderBy: (t, { asc }) => asc(t.endDate),
      where: (t, { and, gte, lte }) =>
        and(gte(t.endDate, new Date()), lte(t.applicationOpen, new Date())),
    });
    return hackathon ?? null;
  }),

  getPreviousHacker: protectedProcedure.query(async ({ ctx }) => {
    // Get the most recent hacker profile for this user
    const hacker = await db.query.Hacker.findFirst({
      where: (t, { eq }) => eq(t.userId, ctx.session.user.id),
    });

    return hacker ?? null;
  }),

  getHackathon: publicProcedure
    .input(
      z.object({
        hackathonName: z.string().optional(),
      }),
    )
    .query(async ({ input }) => {
      if (input.hackathonName == undefined) {
        const hackathon = await db.query.Hackathon.findFirst({
          where: (t, { gt }) => gt(t.endDate, new Date()),
        });

        if (!hackathon) {
          return null;
        }

        return hackathon;
      }

      return await db.query.Hackathon.findFirst({
        where: (t, { eq }) => eq(t.name, input.hackathonName ?? ""),
      });
    }),

  getHackathonById: publicProcedure
    .input(z.string())
    .query(async ({ input }) => {
      const hackathon = await db.query.Hackathon.findFirst({
        where: (t, { eq }) => eq(t.id, input),
      });
      return hackathon ?? null;
    }),

  getPastHackathons: protectedProcedure.query(async ({ ctx }) => {
    // Subquery: each hackathon with number attended
    const hackathonsSubQuery = db
      .select({
        id: Hackathon.id,
        numAttended: count(HackerAttendee.id).as("numAttended"),
      })
      .from(Hackathon)
      .leftJoin(HackerAttendee, eq(Hackathon.id, HackerAttendee.hackathonId))
      .groupBy(Hackathon.id)
      .as("hackathonsSubQuery");

    const hackathons = await db
      .select({
        ...getTableColumns(Hackathon),
        numAttended: hackathonsSubQuery.numAttended,
      })
      .from(Hackathon)
      .leftJoin(HackerAttendee, eq(Hackathon.id, HackerAttendee.hackathonId))
      .leftJoin(Hacker, eq(HackerAttendee.hackerId, Hacker.id))
      .leftJoin(hackathonsSubQuery, eq(hackathonsSubQuery.id, Hackathon.id))
      .where(
        and(
          eq(Hacker.userId, ctx.session.user.id),
          lt(Hackathon.endDate, new Date()), // Only past hackathons
        ),
      )
      .orderBy(desc(Hackathon.startDate));

    return hackathons;
  }),

  getNumConfirmed: protectedProcedure
    .input(
      z.object({
        hackathonId: z.string(),
      }),
    )
    .query(async ({ input }) => {
      const hackers = await db.query.HackerAttendee.findMany({
        where: (t, { eq, and }) =>
          and(eq(t.hackathonId, input.hackathonId), eq(t.status, "confirmed")),
      });

      return hackers.length;
    }),

  createHackathon: permProcedure
    .input(hackathonMutationInput)
    .mutation(async ({ ctx, input }) => {
      permissions.controlPerms.or(["IS_OFFICER"], ctx);

      const values = getHackathonMutationValues(input);
      const duplicate = await db.query.Hackathon.findFirst({
        where: (t, { eq }) => eq(t.name, values.name),
      });

      if (duplicate) {
        throw new TRPCError({
          code: "CONFLICT",
          message: "A hackathon with this route name already exists.",
        });
      }

      const [created] = await db.insert(Hackathon).values(values).returning();

      if (!created) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to create hackathon.",
        });
      }

      return created;
    }),

  updateHackathon: permProcedure
    .input(
      hackathonMutationInput.extend({
        id: z.string().uuid(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      permissions.controlPerms.or(["IS_OFFICER"], ctx);

      const existing = await db.query.Hackathon.findFirst({
        where: (t, { eq }) => eq(t.id, input.id),
      });

      if (!existing) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Hackathon not found.",
        });
      }

      const values = getHackathonMutationValues(input);
      const duplicate = await db.query.Hackathon.findFirst({
        where: (t, { eq }) => eq(t.name, values.name),
      });

      if (duplicate && duplicate.id !== input.id) {
        throw new TRPCError({
          code: "CONFLICT",
          message: "A different hackathon already uses this route name.",
        });
      }

      const [updated] = await db
        .update(Hackathon)
        .set(values)
        .where(eq(Hackathon.id, input.id))
        .returning();

      if (!updated) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to update hackathon.",
        });
      }

      return updated;
    }),
} satisfies TRPCRouterRecord;
