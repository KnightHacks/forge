import { TRPCError } from "@trpc/server";
import { z } from "zod";

import { eq } from "@blade/db";
import {
  Comment,
  CreateCommentSchema,
  UpdateCommentSchema,
} from "@blade/db/schemas/feprep";

import { createTRPCRouter, protectedProcedure, publicProcedure } from "../trpc";

export const commentRouter = createTRPCRouter({
  create: protectedProcedure
    .input(CreateCommentSchema)
    .query(({ ctx, input }) => {
      return ctx.db.insert(Comment).values(input);
    }),
  delete: protectedProcedure
    .input(z.string())
    .mutation(async ({ ctx, input }) => {
      const commentToDelete = await ctx.db.query.Comment.findFirst({
        where: (t, { eq }) => eq(t.id, input),
      });

      if (!commentToDelete) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Comment not found",
        });
      }

      if (commentToDelete.userId !== ctx.session.user.id) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "You can only delete your own comments",
        });
      }

      await ctx.db.delete(Comment).where(eq(Comment.id, input));
    }),
  update: protectedProcedure
    .input(UpdateCommentSchema)
    .mutation(async ({ ctx, input }) => {
      const commentToDelete = await ctx.db.query.Comment.findFirst({
        where: (t, { eq }) => eq(t.id, input.commentId),
      });

      if (!commentToDelete) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Comment not found",
        });
      }

      if (commentToDelete.userId !== ctx.session.user.id) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "You can only update your own comments",
        });
      }

      await ctx.db.update(Comment).set(input);
    }),
  getAllByProblemId: publicProcedure
    .input(z.number())
    .query(({ ctx, input }) => {
      return ctx.db.query.Comment.findMany({
        where: (t, { eq }) => eq(t.problemId, input),
        with: {
          user: true,
        },
      });
    }),
});
