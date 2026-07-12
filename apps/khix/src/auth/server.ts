import { createForgeAuthServer } from "@forge/auth/server-factory";

import { env } from "~/env";

export const KHIX_AUTH_BASE_URL =
  env.NODE_ENV === "production" ? env.KHIX_URL : "http://localhost:3007";

export const khixAuth = createForgeAuthServer({
  baseURL: KHIX_AUTH_BASE_URL,
  defaultRedirectPath: "/dashboard",
});

export const { auth, handlers, signIn, signInRoute, validateToken } = khixAuth;
