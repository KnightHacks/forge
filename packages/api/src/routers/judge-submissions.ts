import { TRPCRouterRecord } from "@trpc/server";
import { z } from "zod";

import{eq, and, like, avg, count } from '@forge/db';
import { db } from "@forge/db/client";
import { adminProcedure } from "../trpc";
import { JudgedSubmission, Judges, Submissions, Teams, Challenges } from "@forge/db/schemas/knight-hacks";


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
            let query = db
            .select({
                // From JudgedSubmission, all ratings
              id: JudgedSubmission.id,
              originality_rating: JudgedSubmission.originality_rating,
              design_rating: JudgedSubmission.design_rating,
              technical_understanding_rating: JudgedSubmission.technical_understanding_rating,
              implementation_rating: JudgedSubmission.implementation_rating,
              wow_factor_rating: JudgedSubmission.wow_factor_rating,
              privateFeedback: JudgedSubmission.privateFeedback,
              publicFeedback: JudgedSubmission.publicFeedback,

              // From Teams
              projectTitle: Teams.projectTitle,
              devpostUrl: Teams.devpostUrl,

              // From Challenges
              challengeTitle: Challenges.title,

              // From Judges
              judgeName: Judges.name,
            })
            .from(JudgedSubmission)
            .innerJoin(Judges,eq(JudgedSubmission.judgeId,Judges.id))
            .innerJoin(Submissions, eq(JudgedSubmission.submissionId, Submissions.id))
            .innerJoin(Teams, eq(Submissions.teamId, Teams.id))
            .innerJoin(Challenges, eq(Submissions.challengeId,Challenges.id));

        const conditions = [];

        if (input.searchTeamName){
            conditions.push(like(Teams.projectTitle, `%${input.searchTeamName}%` ));
        }
        if ( input.challengeFilter){
            conditions.push(eq(Challenges.id, input.challengeFilter));
        }
        if(input.judgeFilter){
            conditions.push(eq(Judges.id, input.judgeFilter));
        }

        if ( conditions.length > 0){
            query = query.where(and(...conditions)) as any;
        }

        const result = await query;
        return result;
            
        }),

    getJudgingMetrics: adminProcedure.query( async () => {
       const results = await db
        .select({
            avgOriginality: avg(JudgedSubmission.originality_rating),
            avgDesign: avg(JudgedSubmission.design_rating),
            avgTechnical: avg(JudgedSubmission.technical_understanding_rating),
            avgImplementation: avg(JudgedSubmission.implementation_rating),
            avgWowFactor: avg(JudgedSubmission.wow_factor_rating),
            totalProjects: count(),
        })
        .from(JudgedSubmission);

        const metrics = results[0];

        if (!metrics){
            return {
                averageRating: 0,
                numberOfProjects: 0,
            };
        }

        const avgOriginality = Number(metrics.avgOriginality) || 0;
        const avgDesign = Number(metrics.avgDesign) || 0;
        const avgTechnical = Number(metrics.avgTechnical) || 0;
        const avgImplementation = Number(metrics.avgImplementation) || 0;
        const avgWowFactor = Number(metrics.avgWowFactor) || 0;

        const overallAverage = (
            avgOriginality + avgDesign + avgTechnical + avgImplementation + avgWowFactor ) / 5;
        

        return {
            averageRating: overallAverage,
            numberOfProjects: Number(metrics.totalProjects),

        }

    }),

    getJudgedSubmissionById: adminProcedure
        .input(z.object({id: z.string() }))
        .query(async ({ input}) => {
            const result = await db
                .select({
                    // From JudgedSubmission, all ratings
                  id: JudgedSubmission.id,
                  originality_rating: JudgedSubmission.originality_rating,
                  design_rating: JudgedSubmission.design_rating,
                  technical_understanding_rating: JudgedSubmission.technical_understanding_rating,
                  implementation_rating: JudgedSubmission.implementation_rating,
                  wow_factor_rating: JudgedSubmission.wow_factor_rating,
                  privateFeedback: JudgedSubmission.privateFeedback,
                  publicFeedback: JudgedSubmission.publicFeedback,

                  // From Teams
                  projectTitle: Teams.projectTitle,
                  devpostUrl: Teams.devpostUrl,

                  // From Challenges
                  challengeTitle: Challenges.title,

                  // From Judges
                  judgeName: Judges.name,
                })
                .from(JudgedSubmission)
                .innerJoin(Judges,eq(JudgedSubmission.judgeId,Judges.id))
                .innerJoin(Submissions, eq(JudgedSubmission.submissionId, Submissions.id))
                .innerJoin(Teams, eq(Submissions.teamId, Teams.id))
                .innerJoin(Challenges, eq(Submissions.challengeId,Challenges.id))
                .where(eq(JudgedSubmission.id,input.id))
                .limit(1);

               return result[0] || null;
                
        })
        
        
}satisfies TRPCRouterRecord;