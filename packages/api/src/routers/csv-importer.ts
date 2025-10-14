import { publicProcedure } from "../trpc";
import z from 'zod';
import { parse } from 'csv-parse/sync';
import { db } from "@forge/db/client";
import { Challenges, Submissions, Teams } from "@forge/db/schemas/knight-hacks";

export const csvImporterRouter = {
    import: publicProcedure.input(z.object({
        hackathon_id: z.string(),
        csvContent: z.string(),
    })).mutation(async ({ input, ctx }) => {
        try {
            // Get raw records
            const rawRecords = parse(input.csvContent, {
                columns: false,
                relax_column_count: true,
                relax_column_count_more: true,
                skip_records_with_empty_values: false,
            });

            if (rawRecords.length === 0) {
                throw new Error('CSV file is empty');
            }

            const headerRow = rawRecords[0];
            const dataRows = rawRecords.slice(1);

            // Can't really happen, but it's here to solve ts complains
            if (!headerRow) {
                throw new Error('CSV file is empty');
            }

            // Map every index to its header name
            const headerRecords = dataRows.map(row => {
                const record: Record<string, string> = {};
                
                row.forEach((value, index) => {
                    // Use header name if it exists, otherwise generate one
                    const key = headerRow[index] ?? `column_${index}`;
                    record[key] = value;
                });
                
                return record;
            });

            // Filter submitted projects
            const submittedRecords = headerRecords.filter(record => 
                record["Highest Step Completed"] === 'Submit'
            ); 

            // Process records to include emails field
            const processedRecords = submittedRecords.map(record => {
                const recordValues = Object.values(record);
                const firstRecord = submittedRecords[0];

                if (!firstRecord) {
                    throw new Error('Unable to read CSV structure');
                }

                const columnNames = Object.keys(firstRecord);
                const teamMember1EmailIndex = columnNames.indexOf("Team Member 1 Email");
                
                const email1 = record["Team Member 1 Email"];
                const email2 = recordValues[teamMember1EmailIndex + 3];
                const email3 = recordValues[teamMember1EmailIndex + 6];
                
                // Combine emails into comma-separated string, filtering out empty values
                const emails = [email1, email2, email3]
                    .filter(email => email && email !== '')
                    .join(', ');
                
                return {
                    ...record,
                    emails,
                };
            });

            // Populate challenges table

            const challenges = Array.from(
                new Set(
                    processedRecords
                    .map(record => record["Opt-In Prize"]) 
                    .filter((record): record is string => record !== undefined && record !== "")
                ).add("Overall")
            );

            const insertedChallenges = await db.insert(Challenges).values(
                challenges.map((challenge: string) => ({
                    title: challenge,
                    location: null,
                    hackathonId: input.hackathon_id,
                }))
            ).returning();

            // Group by teams

            const teamMap = new Map();
                processedRecords.forEach(record => {
                const teamId = record["Project Title"]; 
                
                if (!teamMap.has(teamId)) {
                    teamMap.set(teamId, []);
                }
                
                teamMap.get(teamId).push(record);
            });

            const challengeIdMap = new Map(insertedChallenges.map(challenge => [challenge.title, challenge.id]));
            console.log(challengeIdMap);
            console.log("test");

            // Populate teams table
        
            const insertedTeams = await db.insert(Teams).values(
                Array.from(teamMap.entries()).map(([teamName, teamRows]) => ({
                    hackathonId: input.hackathon_id,
                    projectTitle: teamName,
                    submissionUrl: teamRows[0]["Submission Url"],
                    projectCreatedAt: new Date(teamRows[0]["Project Created At"]),
                    devpostUrl: teamRows[0]["Submission Url"],
                    notes: teamRows[0]["Notes"],
                    emails: teamRows[0].emails,
                    universities: teamRows[0]["Team Colleges/Universities"] ?? teamRows[0]["List All Of The Universities Or Schools That Your Team Members Currently Attend."],
                }))
            ).returning();

            const teamIdMap = new Map(insertedTeams.map(team => [team.projectTitle, team.id]));

            // Populate submissions table

            await db.insert(Submissions).values(
                Array.from(teamMap.entries()).flatMap(([teamName, teamRows]) => 
                    teamRows.map(record => ({
                        challengeId: challengeIdMap.get(record["Opt-In Prize"]) ?? challengeIdMap.get("Overall"),
                        teamId: teamIdMap.get(teamName),
                        judgedStatus: false,
                        hackathonId: input.hackathon_id,
                    })
                ))
            );

            return processedRecords;
        } catch (error) {
            console.error('CSV import error:', error);

            throw new Error(
                error instanceof Error ? error.message : 'Failed to import CSV'
            );
        }
    }),
}