import crypto from "crypto";
import { cookies } from "next/headers";
import { TRPCError } from "@trpc/server";
import { asc, eq } from "drizzle-orm";
import { z } from "zod";

import { db } from "@forge/db/client";
import { JudgeSession } from "@forge/db/schemas/auth";
import { Judges } from "@forge/db/schemas/knight-hacks";

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

  // Query, no input, list all judges
  getJudges: publicProcedure.query(async () => {
    return await db.select().from(Judges).orderBy(asc(Judges.name));
  }),

  // Mutation: create a new judge
  createJudge: adminProcedure
    .input(
      z.object({
        name: z.string().min(1).max(100), // Or some other min/max combo
        roomName: z.string().optional(),
        challengeId: z.string().uuid(),
      }),
    )
    .mutation(async ({ input }) => {
      if (!input.name) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Not a valid judge",
        });
      }

      if (!input.challengeId) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Not a valid challenge",
        });
      }

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
    }),

  //Mutation: update the judge object
  updateJudge: adminProcedure
    .input(
      z.object({
        id: z.string().uuid(),
        roomName: z.string(),
        challengeId: z.string().uuid().optional(),
      }),
    )
    .mutation(async ({ input }) => {
      if (!input.id) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Invalid Judge",
        });
      }

      if (!input.roomName) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Not a valid room",
        });
      }

      const judge = await db.query.Judges.findFirst({
        where: (j, { eq }) => eq(j.id, input.id),
      });
      if (!judge) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Judge not found" });
      }

      if (input.challengeId) {
        const challengeExists = await db.query.Challenges.findFirst({
          where: (c, { eq }) => eq(c.id, input.challengeId ?? ""), // Since challenge is req
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
    }),

  // Mutation: delete a judge
  deleteJudge: adminProcedure
    .input(z.object({ id: z.string().uuid() }))
    .mutation(async ({ input }) => {
      const judge = await db.query.Judges.findFirst({
        where: (j, { eq }) => eq(j.id, input.id),
      });
      if (!judge) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Judge not found" });
      }
      await db.delete(Judges).where(eq(Judges.id, input.id));
    }),
};
