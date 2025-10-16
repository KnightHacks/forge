import crypto from "crypto";
import { cookies } from "next/headers";
import { TRPCError } from "@trpc/server";
import { and, avg, count, eq, like } from "drizzle-orm";
import { z } from "zod";

import { db } from "@forge/db/client";
import { JudgeSession } from "@forge/db/schemas/auth";
import {
  Challenges,
  InsertJudgedSubmissionSchema,
  JudgedSubmission,
  Judges,
  Submissions,
  Teams,
} from "@forge/db/schemas/knight-hacks";

import { env } from "../env";
import { judgeProcedure, publicProcedure } from "../trpc";

const SESSION_TTL_HOURS = 8;

const getSecret = () => {
  const s = env.AUTH_SECRET;
  if (!s) throw new Error("AUTH_SECRET is not set");
  return s;
};

// Base64URL helper
const b64url = (input: Buffer | string) =>
  Buffer.isBuffer(input)
    ? input.toString("base64url")
    : Buffer.from(input).toString("base64url");

const hmac = (data: string) =>
  crypto.createHmac("sha256", getSecret()).update(data).digest("base64url");

interface MagicPayload {
  sub: string;
  roomName: string;
  iat: number;
  exp: number;
}

const signMagicToken = (
  payload: Omit<MagicPayload, "sub" | "iat" | "exp">,
  ttlSeconds = 15 * 60,
) => {
  const header = { alg: "HS256", typ: "JWT" };
  const nowSec = Math.floor(Date.now() / 1000);
  const fullPayload: MagicPayload = {
    sub: "knighthacks-judging",
    roomName: payload.roomName,
    iat: nowSec,
    exp: nowSec + ttlSeconds,
  };

  const headerB64 = b64url(JSON.stringify(header));
  const payloadB64 = b64url(JSON.stringify(fullPayload));
  const toSign = `${headerB64}.${payloadB64}`;
  const sig = hmac(toSign);

  return `${toSign}.${sig}`;
};

const verifyMagicToken = (token: string): MagicPayload => {
  const parts = token.split(".");
  if (parts.length !== 3)
    throw new TRPCError({ code: "UNAUTHORIZED", message: "Malformed token" });

  const [headerB64, payloadB64, sig] = parts;

  if (!sig)
    throw new TRPCError({
      code: "UNAUTHORIZED",
      message: "Invalid Token signature",
    });
  if (!payloadB64)
    throw new TRPCError({
      code: "UNAUTHORIZED",
      message: "Invalid Token payload",
    });
  if (!headerB64)
    throw new TRPCError({
      code: "UNAUTHORIZED",
      message: "Invalid Token header",
    });

  const expected = hmac(`${headerB64}.${payloadB64}`);
  // Constant-time compare
  const a = Buffer.from(sig);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) {
    throw new TRPCError({ code: "UNAUTHORIZED", message: "Invalid signature" });
  }

  let payload: MagicPayload;
  try {
    payload = JSON.parse(
      Buffer.from(payloadB64, "base64url").toString("utf8"),
    ) as MagicPayload;
  } catch {
    throw new TRPCError({ code: "UNAUTHORIZED", message: "Bad payload" });
  }

  if (payload.sub !== "knighthacks-judging") {
    throw new TRPCError({
      code: "UNAUTHORIZED",
      message: "Wrong token subject",
    });
  }
  const nowSec = Math.floor(Date.now() / 1000);
  if (payload.exp < nowSec - 30) {
    throw new TRPCError({ code: "UNAUTHORIZED", message: "Token expired" });
  }
  return payload;
};

export const judgeRouter = {
  // Query: submissions (optionally by hackathonId) with joined metadata
  getSubmissions: judgeProcedure
    .input(
      z.object({
        hackathonId: z.string().optional(),
      }),
    )
    .query(async ({ input }) => {
      const submissions = await db
        .select({
          id: Submissions.id,
          projectName: Teams.projectTitle,
          devpost: Teams.devpostUrl,
          description: Teams.notes,
          challenge: Challenges.title,
          challengeId: Submissions.challengeId,
          teamId: Submissions.teamId,
          judgedStatus: Submissions.judgedStatus,
          hackathonId: Submissions.hackathonId,
        })
        .from(Submissions)
        .leftJoin(Teams, eq(Submissions.teamId, Teams.id))
        .leftJoin(Challenges, eq(Submissions.challengeId, Challenges.id))
        .where(
          input.hackathonId
            ? eq(Submissions.hackathonId, input.hackathonId)
            : undefined,
        );

      return submissions.map((s) => ({
        id: s.id,
        projectName: s.projectName ?? "Untitled Project",
        devpost: s.devpost ?? "No Devpost link provided",
        description: s.description ?? "No description provided",
        challenge: s.challenge ?? "No challenge specified",
        challengeId: s.challengeId,
        teamId: s.teamId,
        judgedStatus: s.judgedStatus,
        hackathonId: s.hackathonId,
      }));
    }),

  // Query: whether this judge has already submitted a rubric for this submission
  hasGivenRubric: judgeProcedure
    .input(
      z.object({
        submissionId: z.string(),
        judgeId: z.string(),
      }),
    )
    .query(async ({ input }) => {
      const existingRubric = await db.query.JudgedSubmission.findFirst({
        where: (t, { eq, and }) =>
          and(
            eq(t.submissionId, input.submissionId),
            eq(t.judgeId, input.judgeId),
          ),
      });

      return !!existingRubric;
    }),

  // Query: judges with their (optional) challenge title
  getJudges: publicProcedure.query(async () => {
    const judges = await db
      .select({
        id: Judges.id,
        name: Judges.name,
        roomName: Judges.roomName,
        challengeId: Judges.challengeId,
        challengeTitle: Challenges.title,
      })
      .from(Judges)
      .leftJoin(Challenges, eq(Judges.challengeId, Challenges.id));

    return judges.map((judge) => ({
      id: judge.id,
      name: judge.name,
      roomName: judge.roomName,
      challengeId: judge.challengeId,
      challengeTitle: judge.challengeTitle ?? "No Challenge",
    }));
  }),

  // Admin: generate a short-lived activation URL
  generateToken: judgeProcedure
    .input(
      z.object({
        roomName: z.string(),
        ttlSeconds: z.number().int().positive().optional(),
      }),
    )
    .query(({ input }) => {
      const token = signMagicToken(
        { roomName: input.roomName },
        input.ttlSeconds ?? 15 * 60,
      );

      const magicUrl = `${env.BLADE_URL}judge/activate?token=${encodeURIComponent(
        token,
      )}`;

      return { magicUrl }; // put this in QR code/s
    }),

  // Public: activate token -> create JudgeSession + cookie
  activateToken: publicProcedure
    .input(
      z.object({
        token: z.string().min(16).max(2048), // 2 KB
      }),
    )
    .mutation(async ({ input }) => {
      const payload = verifyMagicToken(input.token);
      const { roomName } = payload;

      const sessionToken = crypto.randomBytes(32).toString("hex");
      const expires = new Date(Date.now() + SESSION_TTL_HOURS * 60 * 60 * 1000);

      await db.insert(JudgeSession).values({
        sessionToken,
        roomName,
        expires,
      });

      cookies().set({
        name: "sessionToken",
        value: sessionToken,
        httpOnly: true,
        sameSite: "lax",
        secure: env.NODE_ENV === "production",
        path: "/",
        maxAge: SESSION_TTL_HOURS * 60 * 60,
      });

      return {
        ok: true,
        roomName,
      };
    }),

  // Public: create a judged submission and flip the submission's judgedStatus
  createJudgedSubmission: publicProcedure
    .input(
      InsertJudgedSubmissionSchema.omit({
        hackathonId: true,
        id: true,
      }),
    )
    .mutation(async ({ input }) => {
      // Validate the submission exists
      const submission = await db.query.Submissions.findFirst({
        where: (t, { eq }) => eq(t.id, input.submissionId),
      });

      if (!submission) {
        throw new TRPCError({
          message: "Submission not found to update!",
          code: "NOT_FOUND",
        });
      }

      // Validate the judge exists and get their challengeId
      const judge = await db.query.Judges.findFirst({
        where: (j, { eq }) => eq(j.id, input.judgeId),
      });

      if (!judge) {
        throw new TRPCError({
          message: "Judge not found!",
          code: "NOT_FOUND",
        });
      }

      // Check if judge's challengeId matches submission's challengeId
      if (judge.challengeId !== submission.challengeId) {
        throw new TRPCError({
          message:
            "Judge is not authorized to evaluate submissions for this challenge!",
          code: "FORBIDDEN",
        });
      }

      // Ensure this judge hasn't already judged this specific submission
      const alreadyJudged = await db.query.JudgedSubmission.findFirst({
        where: (t, { and, eq }) =>
          and(
            eq(t.submissionId, input.submissionId),
            eq(t.judgeId, input.judgeId),
          ),
      });

      if (alreadyJudged) {
        throw new TRPCError({
          message: "Submission already judged by this judge!",
          code: "CONFLICT",
        });
      }

      // Insert JudgedSubmission
      await db.insert(JudgedSubmission).values({
        hackathonId: submission.hackathonId,
        ...input,
      });

      // Mark the submission as judged (boolean)
      await db
        .update(Submissions)
        .set({ judgedStatus: true })
        .where(eq(Submissions.id, submission.id));

      return { ok: true };
    }),
  // Mutation: create a new judge
  createJudge: judgeProcedure
    .input(
      z.object({
        name: z.string().min(1).max(100),
        roomName: z.string().optional(),
        challengeId: z.string().uuid(),
      }),
    )
    .mutation(async ({ input }) => {
      const challengeExists = await db.query.Challenges.findFirst({
        where: (c, { eq }) => eq(c.id, input.challengeId),
      });
      if (!challengeExists) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Challenge does not exist",
        });
      }

      await db.insert(Judges).values({
        name: input.name,
        roomName: input.roomName ?? "Unassigned",
        challengeId: input.challengeId,
      });

      return { ok: true };
    }),

  // Mutation: update the judge object
  updateJudge: judgeProcedure
    .input(
      z.object({
        id: z.string().uuid(),
        roomName: z.string(),
        challengeId: z.string().uuid().optional(),
      }),
    )
    .mutation(async ({ input }) => {
      const judge = await db.query.Judges.findFirst({
        where: (j, { eq }) => eq(j.id, input.id),
      });
      if (!judge) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Judge not found" });
      }

      if (input.challengeId) {
        const challengeId: string = input.challengeId;
        const challengeExists = await db.query.Challenges.findFirst({
          where: (c, { eq }) => eq(c.id, challengeId),
        });
        if (!challengeExists) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: "Challenge does not exist",
          });
        }
      }

      await db
        .update(Judges)
        .set({
          roomName: input.roomName,
          challengeId: input.challengeId ?? judge.challengeId,
        })
        .where(eq(Judges.id, input.id));

      return { ok: true };
    }),

  // Mutation: delete a judge
  deleteJudge: judgeProcedure
    .input(z.object({ id: z.string().uuid() }))
    .mutation(async ({ input }) => {
      const judge = await db.query.Judges.findFirst({
        where: (j, { eq }) => eq(j.id, input.id),
      });
      if (!judge) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Judge not found" });
      }
      await db.delete(Judges).where(eq(Judges.id, input.id));
      return { ok: true };
    }),

  // Query: get judged submissions with filters
  getJudgedSubmissions: judgeProcedure
    .input(
      z.object({
        searchTeamName: z.string().optional(),
        challengeFilter: z.string().optional(),
        judgeFilter: z.string().optional(),
      }),
    )
    .query(async ({ input }) => {
      let query = db
        .select({
          // From JudgedSubmission, all ratings
          id: JudgedSubmission.id,
          originality_rating: JudgedSubmission.originality_rating,
          design_rating: JudgedSubmission.design_rating,
          technical_understanding_rating:
            JudgedSubmission.technical_understanding_rating,
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
        .innerJoin(Judges, eq(JudgedSubmission.judgeId, Judges.id))
        .innerJoin(
          Submissions,
          eq(JudgedSubmission.submissionId, Submissions.id),
        )
        .innerJoin(Teams, eq(Submissions.teamId, Teams.id))
        .innerJoin(Challenges, eq(Submissions.challengeId, Challenges.id));

      const conditions = [];

      if (input.searchTeamName) {
        conditions.push(like(Teams.projectTitle, `%${input.searchTeamName}%`));
      }
      if (input.challengeFilter) {
        conditions.push(eq(Challenges.id, input.challengeFilter));
      }
      if (input.judgeFilter) {
        conditions.push(eq(Judges.id, input.judgeFilter));
      }

      if (conditions.length > 0) {
        query = query.where(and(...conditions)) as any;
      }

      const result = await query;
      return result;
    }),

  // Query: get judging metrics
  getJudgingMetrics: judgeProcedure.query(async () => {
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

    if (!metrics) {
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

    const overallAverage =
      (avgOriginality +
        avgDesign +
        avgTechnical +
        avgImplementation +
        avgWowFactor) /
      5;

    return {
      averageRating: overallAverage,
      numberOfProjects: Number(metrics.totalProjects),
    };
  }),

  // Query: get judged submission by ID
  getJudgedSubmissionById: judgeProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ input }) => {
      const result = await db
        .select({
          // From JudgedSubmission, all ratings
          id: JudgedSubmission.id,
          originality_rating: JudgedSubmission.originality_rating,
          design_rating: JudgedSubmission.design_rating,
          technical_understanding_rating:
            JudgedSubmission.technical_understanding_rating,
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
        .innerJoin(Judges, eq(JudgedSubmission.judgeId, Judges.id))
        .innerJoin(
          Submissions,
          eq(JudgedSubmission.submissionId, Submissions.id),
        )
        .innerJoin(Teams, eq(Submissions.teamId, Teams.id))
        .innerJoin(Challenges, eq(Submissions.challengeId, Challenges.id))
        .where(eq(JudgedSubmission.id, input.id))
        .limit(1);

      return result[0] ?? null;
    }),
};
