import { publicProcedure } from "../trpc";
import z from 'zod';
import { parse } from 'csv-parse/sync';
import { db } from "@forge/db/client";
import { Challenges, Teams } from "@forge/db/schemas/knight-hacks";

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

            await db.insert(Challenges).values(
                challenges.map((challenge: string) => ({
                    title: challenge,
                    location: null,
                    hackathonId: input.hackathon_id,
                }))
            );

            // Populate teams table
        
            await db.insert(Teams).values(
                processedRecords.map((record: unknown) => ({
                    hackathonId: input.hackathon_id,
                    projectTitle: record["Project Title"],
                    submissionUrl: record["Submission Url"],
                    projectCreatedAt: new Date(record["Project Created At"]),
                    devpostUrl: record["Submission Url"],
                    notes: record["Notes"],
                    emails: record.emails,
                    universities: record["Team Colleges/Universities"] ?? record ["List All Of The Universities Or Schools That Your Team Members Currently Attend."],
                }))
            );

            // Populate submissions table

            

            return processedRecords;
        } catch (error) {
            console.error('CSV import error:', error);

            throw new Error(
                error instanceof Error ? error.message : 'Failed to import CSV'
            );
        }
    }),
}