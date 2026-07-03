"use client";

import { createForgeAuthClient } from "@forge/auth/client-factory";

export const bloomAuthClient = createForgeAuthClient({
  defaultRedirectPath: "/dashboard",
});

export const { auth, authClient, signIn, signOut } = bloomAuthClient;
