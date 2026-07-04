import type { ForgeAuthSession } from "./factory";
import { env } from "./env";
import { createForgeAuthServer } from "./server-factory";

const bladeAuth = createForgeAuthServer({
  baseURL:
    env.NODE_ENV === "production" ? env.BLADE_URL : "http://localhost:3000",
});

export const {
  auth,
  handlers,
  invalidateSessionToken,
  isSecureContext,
  signIn,
  signInRoute,
  validateToken,
} = bladeAuth;

export type Session = ForgeAuthSession;
