import { TRPCError } from "@trpc/server";
import axios from "axios";
import { z } from "zod";

import { env } from "~/env";
import { createTRPCRouter, publicProcedure } from "../trpc";

interface SubmissionResponse {
  stdout: string | null;
  stderr: string | null;
  compile_output: string | null;
  message?: string | null;
  status?: {
    id: number;
    description: string;
  };
}

export const codeRouter = createTRPCRouter({
  runCCode: publicProcedure
    .input(
      z.object({
        code: z.string(),
      }),
    )
    .mutation(async ({ input }) => {
      const { code } = input;

      try {
        // Ensure RAPIDAPI_KEY is defined
        if (!env.RAPIDAPI_KEY) {
          throw new Error(
            "RAPIDAPI_KEY is not defined in environment variables",
          );
        }

        // Prepare the submission data
        const submissionData = {
          source_code: code,
          language_id: 50, // 50 corresponds to C (GCC 9.2.0)
          stdin: "",
        };

        // Submit the code to Judge0 via RapidAPI
        const { data: submission } = await axios.post<SubmissionResponse>(
          "https://judge0-ce.p.rapidapi.com/submissions?base64_encoded=false&wait=true",
          submissionData,
          {
            headers: {
              "Content-Type": "application/json",
              "X-RapidAPI-Key": env.RAPIDAPI_KEY,
              "X-RapidAPI-Host": "judge0-ce.p.rapidapi.com",
            },
          },
        );

        // Extract the output or errors
        const { stdout, stderr, compile_output } = submission;

        if (compile_output) {
          return { output: "", error: compile_output };
        } else if (stderr) {
          return { output: "", error: stderr };
        } else {
          return { output: stdout, error: "" };
        }
      } catch (error: unknown) {
        console.error("Error communicating with Judge0:", error);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "An error occurred while processing the code.",
        });
      }
    }),
});
