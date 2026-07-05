import { createForgeAuthServer } from "@forge/auth/server-factory";

import { env } from "~/env";

export const bloomAuth = createForgeAuthServer({
  baseURL: env.BLOOMKNIGHTS_URL,
  defaultRedirectPath: "/dashboard",
});

export const { auth, handlers, signIn, signInRoute, validateToken } = bloomAuth;
