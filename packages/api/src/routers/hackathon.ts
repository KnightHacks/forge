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
import { HACKATHON_EMAIL_TEMPLATE_PRESET_KEYS } from "@forge/email/hackathons";
import { permissions } from "@forge/utils";
import {
  createHackathonApplicationBackgroundKeySchema,
  createHackathonEmailTemplateKeySchema,
  getHackathonBackgroundIssues,
  getHackathonDateWindowIssues,
  getHackathonEmailTemplateIssues,
  hackathonDisplayNameSchema,
  hackathonRouteNameSchema,
  hackathonThemeSchema,
} from "@forge/validators";

import { permProcedure, protectedProcedure, publicProcedure } from "../trpc";

const hackathonApplicationBackgroundKeySchema =
  createHackathonApplicationBackgroundKeySchema(
    HACKATHONS.APPLICATION_BACKGROUND_KEYS,
  );
const hackathonEmailTemplateKeySchema = createHackathonEmailTemplateKeySchema(
  HACKATHON_EMAIL_TEMPLATE_PRESET_KEYS,
);

const hackathonMutationInput = z.object({
  name: hackathonRouteNameSchema,
  displayName: hackathonDisplayNameSchema,
  theme: hackathonThemeSchema,
  applicationBackgroundEnabled: z.boolean().default(false),
  applicationBackgroundKey: hackathonApplicationBackgroundKeySchema,
  emailTemplateEnabled: z.boolean().default(false),
  emailTemplateKey: hackathonEmailTemplateKeySchema,
  applicationOpen: z.coerce.date(),
  applicationDeadline: z.coerce.date(),
  confirmationDeadline: z.coerce.date(),
  startDate: z.coerce.date(),
  endDate: z.coerce.date(),
});

function assertValidDateWindow(input: z.infer<typeof hackathonMutationInput>) {
  const [issue] = getHackathonDateWindowIssues(input);

  if (issue) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: issue.message,
    });
  }
}

function getHackathonMutationValues(
  input: z.infer<typeof hackathonMutationInput>,
) {
  assertValidDateWindow(input);

  const [backgroundIssue] = getHackathonBackgroundIssues(input);

  if (backgroundIssue) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: backgroundIssue.message,
    });
  }

  const [emailTemplateIssue] = getHackathonEmailTemplateIssues(input);

  if (emailTemplateIssue) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: emailTemplateIssue.message,
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
    emailTemplateEnabled: input.emailTemplateEnabled,
    emailTemplateKey: input.emailTemplateEnabled
      ? input.emailTemplateKey
      : null,
    applicationOpen: input.applicationOpen,
    applicationDeadline: input.applicationDeadline,
    confirmationDeadline: input.confirmationDeadline,
    startDate: input.startDate,
    endDate: input.endDate,
  };
}

function isHackathonNameUniqueError(error: unknown) {
  if (typeof error !== "object" || error === null) return false;

  const dbError = error as {
    code?: unknown;
    constraint?: unknown;
  };

  return (
    dbError.code === "23505" &&
    dbError.constraint === "knight_hacks_hackathon_name_unique"
  );
}

function throwHackathonNameConflict(message: string): never {
  throw new TRPCError({
    code: "CONFLICT",
    message,
  });
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
      orderBy: (t, { desc }) => [desc(t.dateCreated), desc(t.timeCreated)],
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

      let created: typeof Hackathon.$inferSelect | undefined;

      try {
        [created] = await db.insert(Hackathon).values(values).returning();
      } catch (error) {
        if (isHackathonNameUniqueError(error)) {
          throwHackathonNameConflict(
            "A hackathon with this route name already exists.",
          );
        }

        throw error;
      }

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

      let updated: typeof Hackathon.$inferSelect | undefined;

      try {
        [updated] = await db
          .update(Hackathon)
          .set(values)
          .where(eq(Hackathon.id, input.id))
          .returning();
      } catch (error) {
        if (isHackathonNameUniqueError(error)) {
          throwHackathonNameConflict(
            "A different hackathon already uses this route name.",
          );
        }

        throw error;
      }

      if (!updated) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to update hackathon.",
        });
      }

      return updated;
    }),
} satisfies TRPCRouterRecord;
