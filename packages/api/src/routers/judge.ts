import crypto from "crypto";
import { cookies } from "next/headers";
import { TRPCError } from "@trpc/server";
import { z } from "zod";

import { db } from "@forge/db/client";
import { JudgeSession } from "@forge/db/schemas/auth";
import {
  Submissions,
  JudgedSubmission,
  InsertJudgedSubmissionSchema,
} from "@forge/db/schemas/knight-hacks";

import {
  eq,
} from "@forge/db";

import { env } from "../env";
import { adminProcedure, publicProcedure } from "../trpc";

const SESSION_TTL_HOURS = 8;

const getSecret = () => {
  const s = env.AUTH_SECRET;
  if (!s) throw new Error("AUTH_SECRET is not set");
  return s;
};

// Base64URL helper (encode only — using Buffer's "base64url")
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
  generateToken: adminProcedure
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

      return { magicUrl };
    }),

  activateToken: publicProcedure
    .input(
      z.object({
        token: z.string().min(16).max(2048), // 2 KB,
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


  createJudgedSubmission: publicProcedure
    .input(
      InsertJudgedSubmissionSchema.omit({
        hackathonId: true,
        id: true
      })
    )
    .mutation(async ({ input, ctx }) => {
      
      const submission = await db.query.Submissions.findFirst({
        where: (t, { eq }) => eq(t.id, input.submissionId)
      })

      if (!submission){
        throw new TRPCError({
          message: "Submission not found to update!",
          code: "NOT_FOUND",
        });
      }

      if (submission.judgedStatus){
        throw new TRPCError({
          message: "Submission already judged!",
          code: "CONFLICT",
        });
      }

      await db.insert(JudgedSubmission).values({
        hackathonId: submission.hackathonId, 
        ...input,
      });

      // update judged status in submission db
      submission.judgedStatus = true

      await db
        .update(Submissions)
        .set({
          ...submission
        })
        .where(eq(Submissions.id, submission.id));
    }),
};
