import type { TRPCRouterRecord } from "@trpc/server";
import { TRPCError } from "@trpc/server";
import { z } from "zod";

import {
    and,
    count,
    desc,
    eq,
    exists,
    getTableColumns,
    isNull,
    sql,
  } from "@forge/db";

import { db } from "@forge/db/client";
import { log } from "../utils";
import { protectedProcedure } from "../trpc";
import { EventFeedback, InsertEventFeedbackSchema } from "@forge/db/schemas/knight-hacks";

export const eventFeedbackRouter = {
    createEventFeedback: protectedProcedure
        .input(InsertEventFeedbackSchema)
        .mutation(async ({ input }) => {
            
            await db.insert(EventFeedback).values({...input});
        }),
}