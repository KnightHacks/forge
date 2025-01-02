import type { TRPCRouterRecord } from "@trpc/server";

import { and, eq } from "@forge/db";
import { db } from "@forge/db/client";
import {
  Event,
  EventAttendee,
  Hackathon,
  HackathonApplication,
  InsertMemberSchema,
  Member,
} from "@forge/db/schemas/knight-hacks";

import { protectedProcedure } from "../trpc";

export const memberRouter = {
  createMember: protectedProcedure
    .input(InsertMemberSchema.omit({ userId: true, age: true }))
    .mutation(async ({ input, ctx }) => {
      await db.insert(Member).values({
        ...input,
        userId: ctx.session.user.id,
        age: new Date().getFullYear() - new Date(input.dob).getFullYear(),
      });
    }),

  updateMember: protectedProcedure
    .input(InsertMemberSchema.omit({ userId: true, age: true }))
    .mutation(async ({ input, ctx }) => {
      await db
        .update(Member)
        .set({
          ...input,
          age: new Date().getFullYear() - new Date(input.dob).getFullYear(),
        })
        .where(eq(Member.userId, ctx.session.user.id));
    }),

  getMember: protectedProcedure.query(async ({ ctx }) => {
    const member = await db
      .select()
      .from(Member)
      .where(eq(Member.userId, ctx.session.user.id));

    return member[member.length - 1];
  }),

  getHackathons: protectedProcedure.query(async ({ ctx }) => {
    const hackathonsToMember = await db
      .select()
      .from(Hackathon)
      .innerJoin(
        HackathonApplication,
        eq(HackathonApplication.hackathonId, Hackathon.id),
      )
      .innerJoin(Member, eq(Member.id, HackathonApplication.memberId))
      .where(
        and(
          eq(Member.userId, ctx.session.user.id),
          eq(HackathonApplication.state, "checkedin"),
        ),
      );
    const hackathonObjects = hackathonsToMember.map((item) => item.hackathon);
    return hackathonObjects;
  }),

  getEvents: protectedProcedure.query(async ({ ctx }) => {
    const eventsToMember = await db
      .select()
      .from(Event)
      .innerJoin(EventAttendee, eq(EventAttendee.eventId, Event.id))
      .innerJoin(Member, eq(Member.id, EventAttendee.memberId))
      .where(eq(Member.userId, ctx.session.user.id));

    const eventObjects = eventsToMember.map((item) => item.event);
    return eventObjects;
  }),
} satisfies TRPCRouterRecord;
