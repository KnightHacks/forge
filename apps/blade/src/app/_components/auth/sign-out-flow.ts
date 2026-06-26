"use client";

import { authClient } from "@forge/auth";

import { env } from "~/env";

export async function signOutFromBlade() {
  if (env.NEXT_PUBLIC_BLADE_E2E_AUTH === "true") {
    await fetch("/api/e2e/signout", { method: "POST" });
    return;
  }

  await authClient.signOut();
}
