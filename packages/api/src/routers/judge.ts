import crypto from "crypto";
import { cookies } from "next/headers";
import { TRPCError } from "@trpc/server";
import { z } from "zod";

import { db } from "@forge/db/client";
import { JudgeSession } from "@forge/db/schemas/auth";

import { env } from "../env";
import { adminProcedure, publicProcedure } from "../trpc";

const SESSION_TTL_HOURS = 8;

const getSecret = () => {
  const s = env.AUTH_SECRET;
  if (!s) throw new Error("AUTH_SECRET is not set");
  return s;
};

const b64url = (input: Buffer | string) =>
  Buffer.from(input)
    .toString("base64")
    .replace(/=/g, "")
    .replace(/\+/g, "-")
    .replace(/\//g, "_");

const hmac = (data: string) =>
  crypto.createHmac("sha256", getSecret()).update(data).digest("base64url");

interface MagicPayload {
  sub: string;
  roomId: number;
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
    roomId: payload.roomId,
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
  if (!crypto.timingSafeEqual(Buffer.from(sig), Buffer.from(expected))) {
    throw new TRPCError({ code: "UNAUTHORIZED", message: "Invalid signature" });
  }

  let payload: MagicPayload;
  try {
    payload = JSON.parse(
      Buffer.from(payloadB64, "base64").toString("utf8"),
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
  if (payload.exp < nowSec) {
    throw new TRPCError({ code: "UNAUTHORIZED", message: "Token expired" });
  }
  return payload;
};

export const judgeRouter = {
  generateToken: adminProcedure
    .input(
      z.object({
        roomId: z.number(),
        ttlSeconds: z.number().int().positive().optional(),
      }),
    )
    .query(({ input }) => {
      const token = signMagicToken(
        { roomId: input.roomId },
        input.ttlSeconds ?? 15 * 60,
      );

      const magicUrl = `${env.BLADE_URL}judge/activate?token=${encodeURIComponent(token)}`;

      return { magicUrl };
    }),

  activateToken: publicProcedure
    .input(
      z.object({
        token: z.string().min(16),
      }),
    )
    .mutation(async ({ input }) => {
      const payload = verifyMagicToken(input.token);
      const { roomId } = payload;

      console.log("check 1");
      console.log("Room Id: ", roomId);

      const sessionToken = crypto.randomUUID();
      const expires = new Date(Date.now() + SESSION_TTL_HOURS * 60 * 60 * 1000);

      await db.insert(JudgeSession).values({
        sessionToken,
        roomId: roomId,
        expires,
      });

      const maxAge = SESSION_TTL_HOURS * 60 * 60;

      cookies().set({
        name: "sessionToken",
        value: sessionToken,
        httpOnly: true,
        sameSite: "lax",
        secure: env.NODE_ENV === "production",
        path: "/",
        maxAge,
      });

      return {
        ok: true,
        roomId,
      };
    }),
};
