"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { LogOut } from "lucide-react";

import { Button } from "@forge/ui/button";

import { signOutFromBlade } from "./sign-out-flow";

export function SignOutButton() {
  const router = useRouter();
  const [isPending, setIsPending] = useState(false);

  return (
    <Button
      type="button"
      variant="outline"
      aria-label={isPending ? "Signing out" : "Sign out"}
      className="gap-2 px-3 sm:px-4"
      disabled={isPending}
      onClick={async () => {
        setIsPending(true);
        try {
          await signOutFromBlade();
        } finally {
          router.replace("/");
          router.refresh();
        }
      }}
    >
      <LogOut className="h-4 w-4" aria-hidden="true" />
      <span className="hidden sm:inline">
        {isPending ? "Signing out" : "Sign out"}
      </span>
    </Button>
  );
}
