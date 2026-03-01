import { parse } from "csv-parse/sync";
import z from "zod";

import { FORMS } from "@forge/consts";
import { eq, sql } from "@forge/db";
import { db } from "@forge/db/client";
import { Challenges, Submissions, Teams } from "@forge/db/schemas/knight-hacks";

import { permProcedure } from "../trpc";
import { controlPerms } from "../utils";

interface CsvImporterRecord {
  "Opt-In Prize": string | null;
  "Project Title": string;
  "Submission Url": string | null; // A submission can be null if the project was never submitted
  "Highest Step Completed": string;
  "Project Created At": string;
  "Submitter First Name": string;
  "Submitter Last Name": string;
  "Submitter Email": string;
  "Team Member 1 Email": string;
  Notes: string;
  [key: string]: string | null; // Field to treat this interface as a Record<string, string>
}

export const csvImporterRouter = {
  import: permProcedure
    .input(
      z.object({
        hackathon_id: z.string(),
        csvContent: z.string(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      controlPerms.or(["IS_OFFICER"], ctx);

      try {
        // Get raw records
        const rawRecords = parse(input.csvContent, {
          columns: false,
          relax_column_count: true,
          relax_column_count_more: true,
          skip_records_with_empty_values: false,
        });

        if (rawRecords.length === 0) {
          throw new Error("CSV file is empty");
        }

        const headerRow = rawRecords[0];
        const dataRows = rawRecords.slice(1);

        // Can't really happen, but it's here to solve ts complains
        if (!headerRow) {
          throw new Error("CSV file is empty");
        }

        if (dataRows.length === 0) {
          throw new Error("CSV file has headers but no data");
        }

        // Map every index to its header name
        const headerRecords = dataRows.map((row) => {
          const record: Record<string, string> = {};

          row.forEach((value, index) => {
            // Use header name if it exists, otherwise generate one
            const key = headerRow[index] ?? `column_${index}`;
            record[key] = value;
          });

          return record as CsvImporterRecord;
        });

        // Process records to include emails field
        const processedRecords = headerRecords.map((record) => {
          const recordValues = Object.values(record);
          const firstRecord = headerRecords[0];

          if (!firstRecord) {
            throw new Error("Unable to read CSV structure");
          }

          const columnNames = Object.keys(firstRecord);
          const teamMember1EmailIndex = columnNames.indexOf(
            "Team Member 1 Email",
          );

          const email1 = record["Submitter Email"];
          const email2 = record["Team Member 1 Email"];
          const email3 =
            recordValues[
              teamMember1EmailIndex + FORMS.DEVPOST_TEAM_MEMBER_EMAIL_OFFSET
            ];
          const email4 =
            recordValues[
              teamMember1EmailIndex + FORMS.DEVPOST_TEAM_MEMBER_EMAIL_OFFSET * 2
            ];

          // Combine emails into comma-separated string, filtering out empty values
          const emails = [email1, email2, email3, email4]
            .filter((email): email is string => Boolean(email) && email !== "") // Boolean(email) makes sure to handle undefined emails
            .join(", ");

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
                .map((record) => record["Opt-In Prize"])
                .filter(
                  (record): record is string =>
                    record !== null && record !== "",
                ),
            ).add("General"),
          );

          const insertedChallenges = await tx
            .insert(Challenges)
            .values(
              challenges.map((challenge: string) => ({
                title: challenge,
                hackathonId: input.hackathon_id,
                description: "",
                sponsor: "",
              })),
            )
            .onConflictDoNothing({
              target: [Challenges.title, Challenges.hackathonId],
            })
            .returning();

          const allChallenges = await tx
            .select()
            .from(Challenges)
            .where(eq(Challenges.hackathonId, input.hackathon_id));

          // Group by teams

          const teamMap = new Map<
            string,
            (CsvImporterRecord & { emails: string })[]
          >();
          processedRecords.forEach((record) => {
            const firstName = record["Submitter First Name"].trim();
            const lastName = record["Submitter Last Name"].trim();
            const createdAt = record["Project Created At"];
            const teamName = record["Project Title"];
            const matchKey = `${firstName}_${lastName}:${createdAt}:${teamName}`;

            const team = teamMap.get(matchKey);

            if (team) {
              team.push(record);
            } else {
              teamMap.set(matchKey, [record]);
            }
          });

          const challengeIdMap = new Map(
            allChallenges.map((challenge) => [challenge.title, challenge.id]),
          );

          // Populate teams table

          const teamValues = Array.from(teamMap.entries()).map(
            ([matchKey, teamRows]) => {
              const firstRow = teamRows[0];
              if (!firstRow) throw new Error(`No rows for team ${matchKey}`);

              const projectCreatedAt = new Date(firstRow["Project Created At"]);
              if (isNaN(projectCreatedAt.getTime())) {
                throw new Error(
                  `Invalid date format for project "${firstRow["Project Title"]}": "${firstRow["Project Created At"]}"`,
                );
              }

              return {
                hackathonId: input.hackathon_id,
                projectTitle: firstRow["Project Title"],
                submissionUrl: firstRow["Submission Url"],
                projectCreatedAt,
                isProjectSubmitted:
                  firstRow["Highest Step Completed"] === "Submit"
                    ? true
                    : false,
                devpostUrl: firstRow["Submission Url"],
                notes: firstRow.Notes,
                emails: firstRow.emails,
                universities:
                  firstRow["Team Colleges/Universities"] ??
                  firstRow[
                    "List All Of The Universities Or Schools That Your Team Members Currently Attend."
                  ],
                matchKey,
              };
            },
          );

          if (teamValues.length === 0) {
            throw new Error("No valid teams found in CSV");
          }

          const insertedTeams = await tx
            .insert(Teams)
            .values(teamValues)
            .onConflictDoUpdate({
              target: Teams.matchKey,
              set: {
                projectTitle: sql`excluded.project_title`,
                submissionUrl: sql`excluded.submission_url`,
                projectCreatedAt: sql`excluded.project_created_at`,
                isProjectSubmitted: sql`excluded.is_project_submitted`,
                devpostUrl: sql`excluded.devpost_url`,
                notes: sql`excluded.notes`,
                emails: sql`excluded.emails`,
                universities: sql`excluded.universities`,
              },
              where: eq(Teams.isProjectSubmitted, false),
            })
            .returning();

          // Query all teams instead of using .returning() to avoid data being skipped
          const allTeams = await tx
            .select()
            .from(Teams)
            .where(eq(Teams.hackathonId, input.hackathon_id));

          const teamIdMap = new Map(
            allTeams.map((team) => [team.matchKey, team.id]),
          );

          const generalChallengeId = challengeIdMap.get("General");
          if (!generalChallengeId) {
            throw new Error("General challenge not found");
          }

          // Populate submissions table

          const submissions = Array.from(teamMap.entries()).flatMap(
            ([matchKey, teamRows]) => {
              const teamId = teamIdMap.get(matchKey);
              if (!teamId) {
                console.error(`Team not found for matchKey: ${matchKey}`);
                throw new Error(`Failed to find team ID for: ${matchKey}`);
              }

              const challengeIds = new Set<string>();

              // Always add a submission to "General" for every team
              challengeIds.add(generalChallengeId);

              // Add any opt-in challenges
              teamRows.forEach((record) => {
                const optInPrize = record["Opt-In Prize"];

                if (optInPrize && optInPrize !== "") {
                  const challengeId = challengeIdMap.get(optInPrize);

                  if (challengeId) {
                    challengeIds.add(challengeId);
                  }
                }
              });

              return Array.from(challengeIds).map((challengeId) => ({
                challengeId,
                teamId,
                hackathonId: input.hackathon_id,
              }));
            },
          );

          // Deduplicate by team id and challenge id
          const uniqueSubmissions = Array.from(
            new Map(
              submissions.map((sub) => [
                `${sub.teamId}-${sub.challengeId}`,
                sub,
              ]),
            ).values(),
          );

          if (uniqueSubmissions.length === 0) {
            throw Error("No valid submissions to insert");
          }

          const insertedSubmissions = await tx
            .insert(Submissions)
            .values(uniqueSubmissions)
            .onConflictDoNothing({
              target: [Submissions.teamId, Submissions.challengeId],
            })
            .returning();

          return {
            success: true,
            recordsProcessed: processedRecords.length,
            teamsCreated: insertedTeams.length,
            challengesCreated: insertedChallenges.length,
            submissionsCreated: insertedSubmissions.length,
          };
        });

        return result;
      } catch (error) {
        console.error("CSV import error:", error);

        throw new Error(
          error instanceof Error ? error.message : "Failed to import CSV",
        );
      }
    }),
};
