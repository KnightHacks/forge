import { TOPICS } from "@feprep/consts";
import { and, count, eq, questions, sql, votes } from "@feprep/db";
import { TRPCError } from "@trpc/server";
import { z } from "zod";

import {
  //   adminProcedure,
  createTRPCRouter,
  protectedProcedure,
  publicProcedure,
} from "../trpc";

export const questionsRouter = createTRPCRouter({
  randomQuestionId: publicProcedure.query(async ({ ctx }) => {
    const question = (
      await ctx.db
        .select({
          value: questions.id,
        })
        .from(questions)
        .orderBy(sql`RANDOM()`)
        .limit(1)
    )[0];

    if (!question) {
      throw new Error("Failed to get random question");
    }

    return question.value;
  }),
  count: publicProcedure.query(async ({ ctx }) => {
    const question = (
      await ctx.db
        .select({
          value: count(),
        })
        .from(questions)
    )[0];

    if (!question) {
      throw new Error("Failed to count questions");
    }

    return question.value;
  }),
  all: publicProcedure.query(({ ctx }) => {
    return ctx.db.query.questions.findMany();
    // return ctx.db.query.Question.findMany();
  }),
  //   delete: adminProcedure.input(z.number()).mutation(({ ctx, input }) => {
  //     return ctx.db.delete(questions).where(eq(questions.id, input));
  //   }),
  //   create: adminProcedure
  //     .input(CreateQuestionSchema)
  //     .mutation(({ ctx, input }) => {
  //       return ctx.db.insert(questions).values(input);
  //     }),
  //   update: adminProcedure
  //     .input(UpdateQuestionSchema)
  //     .mutation(async ({ ctx, input: { questionId, ...question } }) => {
  //       const utapi = new UTApi();

  //       // Delete the previous question and solution pdfs
  //       const previousQuestion = await ctx.db.query.questions.findFirst({
  //         where: eq(questions.id, questionId),
  //       });

  //       if (!previousQuestion) {
  //         throw new TRPCError({
  //           code: "NOT_FOUND",
  //           message: "Question not found",
  //         });
  //       }

  //       if (question.pdf) {
  //         await utapi.deleteFiles(previousQuestion.pdf.split("/").pop()!);
  //       }

  //       return ctx.db
  //         .update(questions)
  //         .set(question)
  //         .where(eq(questions.id, questionId));
  //     }),
  byId: publicProcedure.input(z.number()).query(({ ctx, input }) => {
    return ctx.db.query.questions.findFirst({
      where: eq(questions.id, input),
    });
  }),
  byTopic: publicProcedure.input(z.enum(TOPICS)).query(({ ctx, input }) => {
    return ctx.db.query.questions.findMany({
      where: eq(questions.topic, input),
    });
  }),
  vote: protectedProcedure
    .input(
      z.object({
        questionId: z.number(),
        vote: z.enum(["easy", "medium", "hard"]),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const voteColumn = `${input.vote}Votes` as const;
      const existingVote = await ctx.db.query.votes.findFirst({
        where: and(
          eq(votes.questionId, input.questionId),
          eq(votes.userId, ctx.user.id),
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
            .update(votes)
            .set({
              vote: input.vote,
            })
            .where(eq(votes.id, existingVote.id));

          await db
            .update(questions)
            .set({
              [previousVoteColumn]: sql`${questions[previousVoteColumn]} - 1`,
              [voteColumn]: sql`${questions[voteColumn]} + 1`,
            })
            .where(eq(questions.id, input.questionId));
        } else {
          await db.insert(votes).values({
            ...input,
            userId: ctx.user.id,
          });

          await db
            .update(questions)
            .set({
              [voteColumn]: sql`${questions[voteColumn]} + 1`,
            })
            .where(eq(questions.id, input.questionId));
        }
      });

      return {
        isNewVote: !existingVote,
      };
    }),
});
