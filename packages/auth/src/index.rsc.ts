import { headers } from "next/headers";

import {
  auth as betterAuthInstance,
  invalidateSessionToken,
  isSecureContext,
  validateToken,
} from "./config";

export { validateToken, invalidateSessionToken, isSecureContext };

export type Session = Omit<typeof betterAuthInstance.$Infer.Session, "user"> & {
  user: (typeof betterAuthInstance.$Infer.Session)["user"];
};

export const handlers = {
  GET: betterAuthInstance.handler,
  POST: betterAuthInstance.handler,
};

export const auth = async () => {
  try {
    const headersList = headers();
    const sess = await betterAuthInstance.api.getSession({
      headers: headersList,
    });
    return sess;
  } catch {
    return null;
  }
};
