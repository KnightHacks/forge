import { publicProcedure } from "../trpc";
import z from 'zod';
import { parse } from 'csv-parse/sync';
import { db } from "@forge/db/client";
import { Challenges, Submissions, Teams } from "@forge/db/schemas/knight-hacks";

interface CsvImporterRecord {
    "Opt-In Prize": string | null,
    "Project Title": string,
    "Submission Url": string,
    "Project Status": string,
    "Judging Status": string,
    "Highest Step Completed": string,
    "Project Created At": string,
    "Submitter Email": string,
    "Team Member 1 Email": string,
    "Notes": string,
    [key: string]: string | null; // Field to treat this interface as a Record<string, string>
};

export const csvImporterRouter = {
    import: publicProcedure.input(z.object({
        hackathon_id: z.string(),
        csvContent: z.string(),
    })).mutation(async ({ input }) => {
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

            if (dataRows.length === 0) {
                throw new Error('CSV file has headers but no data');
            }

            // Map every index to its header name
            const headerRecords = dataRows.map(row => {
                const record: Record<string, string> = {};
                
                row.forEach((value, index) => {
                    // Use header name if it exists, otherwise generate one
                    const key = headerRow[index] ?? `column_${index}`;
                    record[key] = value;
                });
                
                return record as CsvImporterRecord;
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
                
                const email1 = record["Submitter Email"];
                const email2 = record["Team Member 1 Email"];
                const email3 = recordValues[teamMember1EmailIndex + 3];
                const email4 = recordValues[teamMember1EmailIndex + 6];
                
                // Combine emails into comma-separated string, filtering out empty values
                const emails = [email1, email2, email3, email4]
                    .filter(email => email && email !== '')
                    .join(', ');
                
                return {
                    ...record,
                    emails,
                };
            });

            // We use a transaction to avoid partial data being inserted. 
            // ie. If one db operation fails, all others are canceled
            const result = await db.transaction(async (tx) => {

                // Populate challenges table
                const challenges = Array.from(
                    new Set(
                        processedRecords
                        .map(record => record["Opt-In Prize"]) 
                        .filter((record): record is string => record !== null && record !== "")
                    ).add("Overall")
                );

                const insertedChallenges = await tx.insert(Challenges).values(
                    challenges.map((challenge: string) => ({
                        title: challenge,
                        location: null,
                        hackathonId: input.hackathon_id,
                    }))
                ).returning();

                // Group by teams

                const teamMap = new Map<string, (CsvImporterRecord & {emails: string})[]>();
                    processedRecords.forEach(record => {
                    const teamId = record["Project Title"];

                    const team = teamMap.get(teamId);
                    
                    if (team) {
                        team.push(record);
                    } else {
                        teamMap.set(teamId, [record]);
                    }
                });

                const challengeIdMap = new Map(insertedChallenges.map(challenge => [challenge.title, challenge.id]));

                // Populate teams table
            
                const insertedTeams = await tx.insert(Teams).values(
                    Array.from(teamMap.entries()).map(([teamName, teamRows]) => {
                        const firstRow = teamRows[0];
                        if (!firstRow) throw new Error(`No rows for team ${teamName}`);

                        return {
                            hackathonId: input.hackathon_id,
                            projectTitle: teamName,
                            submissionUrl: firstRow["Submission Url"],
                            projectCreatedAt: new Date(firstRow["Project Created At"]),
                            devpostUrl: firstRow["Submission Url"],
                            notes: firstRow.Notes,
                            emails: firstRow.emails,
                            universities: firstRow["Team Colleges/Universities"] ?? firstRow["List All Of The Universities Or Schools That Your Team Members Currently Attend."],
                        }
                    })
                ).returning();

                const teamIdMap = new Map(insertedTeams.map(team => [team.projectTitle, team.id]));

                // Populate submissions table

                const submissions = Array.from(teamMap.entries()).flatMap(([teamName, teamRows]) =>
                teamRows
                    .map(record => {
                    const challengeId = challengeIdMap.get(record["Opt-In Prize"] ?? "Overall") ?? challengeIdMap.get("Overall"); // Second "Overall" is here in case "Opt-In Prize" exists but it's challenge returns null
                    const teamId = teamIdMap.get(teamName);
                    
                    // Only return if both IDs exist
                    if (!challengeId || !teamId) return null;
                    
                    return {
                        challengeId,
                        teamId,
                        judgedStatus: false,
                        hackathonId: input.hackathon_id,
                    };
                    })
                    .filter((submission): submission is NonNullable<typeof submission> => submission !== null)
                );

                await tx.insert(Submissions).values(submissions);

                return {
                    success: true,
                    recordsProcessed: processedRecords.length,
                    teamsCreated: insertedTeams.length,
                    challengesCreated: insertedChallenges.length,
                    submissionsCreated: submissions.length,
                };
            });

            return result;
        } catch (error) {
            console.error('CSV import error:', error);

            throw new Error(
                error instanceof Error ? error.message : 'Failed to import CSV'
            );
        }
    }),
}