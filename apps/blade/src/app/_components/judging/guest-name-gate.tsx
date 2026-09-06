"use client";

import type { FormEvent } from "react";
import { useState } from "react";
import { BadgeCheck } from "lucide-react";

import { Button } from "@forge/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@forge/ui/dialog";
import { Input } from "@forge/ui/input";
import { Label } from "@forge/ui/label";
import { toast } from "@forge/ui/toast";
import { guestJudgeNameSchema } from "@forge/validators";

import { useNavigationRouter as useRouter } from "~/app/_components/shared/route-transition-link";
import { api } from "~/trpc/react";

export function GuestNameGate() {
  const router = useRouter();
  const complete = api.judging.completeGuest.useMutation();
  const [displayName, setDisplayName] = useState("");
  const validName = guestJudgeNameSchema.safeParse({ displayName }).success;

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    try {
      await complete.mutateAsync({ displayName });
      router.refresh();
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Could not start judging.",
      );
    }
  }

  return (
    <main className="mx-auto flex min-h-[calc(100svh-4rem)] max-w-3xl items-center px-4 py-10 sm:px-6">
      <Dialog open>
        <DialogContent
          className="border-primary/25 bg-card sm:max-w-md [&>button]:hidden"
          onEscapeKeyDown={(event) => event.preventDefault()}
          onInteractOutside={(event) => event.preventDefault()}
        >
          <form className="space-y-6" onSubmit={submit}>
            <DialogHeader className="text-left">
              <div className="mb-2 flex size-11 items-center justify-center rounded-md border border-primary/30 bg-primary/15 text-primary">
                <BadgeCheck className="size-5" aria-hidden="true" />
              </div>
              <DialogTitle>Introduce yourself</DialogTitle>
              <DialogDescription>
                Please introduce yourself. Your name will be used for judging
                deliberation and identity verification. Your responses will{" "}
                <strong>NOT</strong> be shared.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-2">
              <Label htmlFor="guest-judge-name">Full name</Label>
              <Input
                autoComplete="name"
                autoFocus
                id="guest-judge-name"
                maxLength={100}
                onChange={(event) => setDisplayName(event.target.value)}
                placeholder="Your full name"
                required
                value={displayName}
              />
            </div>
            <Button
              className="h-11 w-full"
              disabled={!validName || complete.isPending}
              type="submit"
            >
              {complete.isPending ? "Opening room…" : "Enter judging room"}
            </Button>
          </form>
        </DialogContent>
      </Dialog>
    </main>
  );
}
