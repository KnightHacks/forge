import { publicProcedure } from "../trpc";
import z from 'zod';
import { parse } from 'csv-parse/sync';
import { db } from "@forge/db/client";
import { Submissions } from "@forge/db/schemas/knight-hacks";

export const csvImporterRouter = {
    import: publicProcedure.input(z.object({
        csvContent: z.string(),
    })).mutation(async ({ input, ctx }) => {
        try {
            const records: Record<string, string>[] = parse(input.csvContent, {
                columns: true,
                skip_empty_lines: true,
                trim: true,
                relax_column_count: true,
            });

            if (records.length === 0) {
                throw new Error('CSV file is empty');
            }

            // Filter submitted projects
            const submittedRecords = records.filter(record => 
                record["Highest Step Completed"] === 'Submit'
            );

            await db.insert(Submissions).values();



            return submittedRecords;
        } catch (error) {
            console.error('CSV import error:', error);

            throw new Error(
                error instanceof Error ? error.message : 'Failed to import CSV'
            );
        }
    }),
}