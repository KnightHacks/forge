"use client";

import { createForgeAuthClient } from "@forge/auth/client-factory";

export const khixAuthClient = createForgeAuthClient({
  defaultRedirectPath: "/dashboard",
});

export const { auth, authClient, signIn, signOut } = khixAuthClient;
