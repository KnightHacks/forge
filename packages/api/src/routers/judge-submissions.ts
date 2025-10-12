import { TRPCRouterRecord } from "@trpc/server";
import { z } from "zod";

import{eq, and, like, avg, count } from '@forge/db';
import { db } from "@forge/db/client";
import { adminProcedure, publicProcedure, protectedProcedure } from "../trpc";


export const judgeSubmissionsRouter = {
    getJudgedSubmissions: adminProcedure
        .input(
            z.object({
                searchTeamName: z.string().optional(),
                challengeFilter: z.string().optional(),
                judgeFilter: z.string().optional(),
            }),
        )
        .query(async({input}) => {
            /// Implement this once the tables are made
            console.log("Getting judged submissions with filters: ", input);

            return []
        }),

    getJudgingMetrics: adminProcedure.query( async () => {
        /// Implement this once the tables are made
        console.log("Getting judging metrics");

        return{
            averageRating: 0,
            numberOfProjects: 0,
        }
    }),

    getJudgedSubmissionById: adminProcedure
        .input(z.object({id: z.string() }))
        .query(async ({ input}) => {
            /// Implement this once the tables are made
            console.log("Getting judged submission by ID:",input.id);

            return null;
        })

}satisfies TRPCRouterRecord;