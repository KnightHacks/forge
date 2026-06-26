"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { LogOut } from "lucide-react";

import { authClient } from "@forge/auth";
import { Button } from "@forge/ui/button";

import { env } from "~/env";

export function SignOutButton() {
  const router = useRouter();
  const [isPending, setIsPending] = useState(false);

  return (
    <Button
      type="button"
      variant="outline"
      className="gap-2"
      disabled={isPending}
      onClick={async () => {
        setIsPending(true);
        if (env.NEXT_PUBLIC_BLADE_E2E_AUTH === "true") {
          await fetch("/api/e2e/signout", { method: "POST" });
        } else {
          await authClient.signOut();
        }
        router.replace("/");
        router.refresh();
      }}
    >
      <LogOut className="h-4 w-4" aria-hidden="true" />
      {isPending ? "Signing out" : "Sign out"}
    </Button>
  );
}
