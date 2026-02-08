import type { TRPCRouterRecord } from "@trpc/server";
import { TRPCError } from "@trpc/server";
import { z } from "zod";

import { DISCORD, EVENTS } from "@forge/consts";
import { and, eq, sql } from "@forge/db";
import { db } from "@forge/db/client";
import {
  EventFeedback,
  InsertEventFeedbackSchema,
  Member,
} from "@forge/db/schemas/knight-hacks";

import { permProcedure } from "../trpc";
import { controlPerms, log } from "../utils";

export const eventFeedbackRouter = {
  createEventFeedback: permProcedure
    .input(InsertEventFeedbackSchema)
    .mutation(async ({ input, ctx }) => {
      controlPerms.or(["IS_JUDGE"], ctx);
      const existingFeedback = await db.query.EventFeedback.findFirst({
        where: (t, { eq }) =>
          and(eq(t.memberId, input.memberId), eq(t.eventId, input.eventId)),
      });

      if (existingFeedback) {
        throw new TRPCError({
          message: "Cannot give feedback more than once for this event!",
          code: "FORBIDDEN",
        });
      }

      const existingEvent = await db.query.Event.findFirst({
        where: (t, { eq }) => eq(t.id, input.eventId),
      });

      const existingMember = await db.query.Member.findFirst({
        where: (t, { eq }) => eq(t.id, input.memberId),
      });

      if (!existingEvent) {
        throw new TRPCError({
          message: "Event not found!",
          code: "NOT_FOUND",
        });
      }

      if (!existingMember) {
        throw new TRPCError({
          message: "Member not found!",
          code: "NOT_FOUND",
        });
      }

      await db.insert(EventFeedback).values({ ...input });

      await db
        .update(Member)
        .set({
          points: sql`${Member.points} + ${EVENTS.EVENT_FEEDBACK_POINTS_INCREMENT}`,
        })
        .where(eq(Member.id, input.memberId));

      await log({
        title: "Feedback Given",
        message: `${existingMember.firstName} ${existingMember.lastName} gave feedback for ${existingEvent.name}!`,
        color: "tk_blue",
        userId: ctx.session.user.discordUserId,
      });
    }),

  hasGivenFeedback: permProcedure
    .input(
      z.object({
        eventId: z.string(),
        memberId: z.string(),
      }),
    )
    .query(async ({ input, ctx }) => {
      controlPerms.or(["IS_JUDGE"], ctx);
      const givenFeedback = await db.query.EventFeedback.findFirst({
        where: (t, { eq }) =>
          and(eq(t.memberId, input.memberId), eq(t.eventId, input.eventId)),
      });

      return !!givenFeedback;
    }),

  logHackathonFeedback: permProcedure
    .input(
      z.object({
        description: z.string(),
      }),
    )
    .mutation(async ({ input, ctx }) => {
      await log({
        message: `<@&${DISCORD.OFFICER_ROLE}> ${input.description}`,
        title: "Hackathon Issue",
        color: "uhoh_red",
        userId: ctx.session.user.discordUserId,
      });
    }),
} satisfies TRPCRouterRecord;
