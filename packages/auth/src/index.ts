import NextAuth from "next-auth";

import { authConfig, isDummyEnvironment } from "./config";

export type { Session } from "next-auth";

const nextAuth = NextAuth(authConfig);

// Create a wrapper for auth that returns null in dummy environment
const originalAuth = nextAuth.auth;
const wrappedAuth = (...args: Parameters<typeof originalAuth>) => {
  if (isDummyEnvironment) {
    return null;
  }
  return originalAuth(...args);
};

export const handlers = nextAuth.handlers;
export const auth = wrappedAuth;
export const signIn = nextAuth.signIn;
export const signOut = nextAuth.signOut;

export {
  invalidateSessionToken,
  validateToken,
  isSecureContext,
  isDummyEnvironment,
} from "./config";
