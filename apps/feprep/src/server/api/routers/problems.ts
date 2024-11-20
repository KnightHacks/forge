import { TRPCError } from "@trpc/server";
import { z } from "zod";

import { LOWERCASE_DIFFICULTIES, TOPICS } from "@blade/consts/feprep";
import { eq, sql } from "@blade/db";
import { Problem, Vote } from "@blade/db/schema";

import { createTRPCRouter, protectedProcedure, publicProcedure } from "../trpc";

export const problemRouter = createTRPCRouter({
  getRandomProblemId: publicProcedure.query(async ({ ctx }) => {
    const problem = (
      await ctx.db
        .select({
          value: Problem.id,
        })
        .from(Problem)
        .orderBy(sql`RANDOM()`)
        .limit(1)
    )[0];

    if (!problem) {
      throw new TRPCError({
        code: "NOT_FOUND",
        message: `Problem ${problem} not found`,
      });
    }

    return problem.value;
  }),
  all: publicProcedure.query(({ ctx }) => {
    return ctx.db.query.Problem.findMany();
  }),
  getById: publicProcedure.input(z.string()).query(({ ctx, input }) => {
    return ctx.db.query.Problem.findFirst({
      where: (t, { eq }) => eq(t.id, input),
    });
  }),
  getByTopic: publicProcedure.input(z.enum(TOPICS)).query(({ ctx, input }) => {
    return ctx.db.query.Problem.findMany({
      where: (t, { eq }) => eq(t.topic, input),
    });
  }),
  vote: protectedProcedure
    .input(
      z.object({
        problemId: z.string(),
        vote: z.enum(LOWERCASE_DIFFICULTIES),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const voteColumn = `${input.vote}Votes` as const;
      const existingVote = await ctx.db.query.Vote.findFirst({
        where: (t, { and, eq }) =>
          and(
            eq(Vote.problemId, input.problemId),
            eq(Vote.userId, ctx.session.user.id),
          ),
      });

      if (existingVote?.vote === input.vote) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "You have already voted with this option",
        });
      }

      await ctx.db.transaction(async (db) => {
        if (existingVote) {
          const previousVoteColumn = `${existingVote.vote}Votes` as const;
          await db
            .update(Vote)
            .set({
              vote: input.vote,
            })
            .where(eq(Vote.id, existingVote.id));

          await db
            .update(Problem)
            .set({
              [previousVoteColumn]: sql`${Problem[previousVoteColumn]} - 1`,
              [voteColumn]: sql`${Problem[voteColumn]} + 1`,
            })
            .where(eq(Problem.id, input.problemId));
        } else {
          await db.insert(Vote).values({
            ...input,
            userId: ctx.session.user.id,
          });

          await db
            .update(Problem)
            .set({
              [voteColumn]: sql`${Problem[voteColumn]} + 1`,
            })
            .where(eq(Problem.id, input.problemId));
        }
      });

      return {
        isNewVote: !existingVote,
      };
    }),
});
