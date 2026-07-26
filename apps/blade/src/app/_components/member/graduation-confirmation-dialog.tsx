"use client";

import { useState } from "react";
import { CalendarClock, GraduationCap, Loader2 } from "lucide-react";

import { Button } from "@forge/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@forge/ui/dialog";
import { Input } from "@forge/ui/input";
import { Label } from "@forge/ui/label";
import { GRAD_TERMS } from "@forge/validators";

export function GraduationConfirmationDialog({
  currentGraduationLabel,
  error,
  isPending,
  onConfirmGraduated,
  onExtendGraduation,
}: {
  currentGraduationLabel: string;
  error?: string | null;
  isPending: boolean;
  onConfirmGraduated: () => void;
  onExtendGraduation: (input: {
    gradTerm: (typeof GRAD_TERMS)[number];
    gradYear: number;
  }) => void;
}) {
  const [gradTerm, setGradTerm] =
    useState<(typeof GRAD_TERMS)[number]>("Spring");
  const [gradYear, setGradYear] = useState(new Date().getFullYear() + 1);

  return (
    <Dialog open onOpenChange={() => undefined}>
      <DialogContent
        data-graduation-confirmation="required"
        showCloseButton={false}
        className="max-h-[calc(100svh-1rem)] w-[calc(100svw-1rem)] max-w-xl gap-0 overflow-y-auto border-primary/25 bg-card p-0 shadow-2xl shadow-black/50"
        onEscapeKeyDown={(event) => event.preventDefault()}
        onInteractOutside={(event) => event.preventDefault()}
        onPointerDownOutside={(event) => event.preventDefault()}
      >
        <DialogHeader className="border-b border-border/70 px-5 py-5 text-left sm:px-6">
          <div className="mb-3 flex h-11 w-11 items-center justify-center rounded-md border border-primary/25 bg-primary/15 text-primary">
            <GraduationCap className="h-5 w-5" aria-hidden="true" />
          </div>
          <DialogTitle className="text-2xl">Did you graduate?</DialogTitle>
          <DialogDescription className="max-w-md leading-6">
            Your saved graduation date was {currentGraduationLabel}. Choose one
            path so Blade can show the right dashboard.
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 px-5 py-5 sm:px-6">
          {error ? (
            <p
              role="alert"
              className="rounded-md border border-destructive/40 bg-destructive/10 px-4 py-3 text-sm text-destructive"
            >
              {error}
            </p>
          ) : null}
          <section className="rounded-md border border-white/10 bg-background/60 p-4">
            <h2 className="font-semibold">Yes, I graduated</h2>
            <p className="mt-1 text-sm leading-5 text-muted-foreground">
              Switch this account to the alumni dashboard.
            </p>
            <Button
              type="button"
              className="mt-4 min-h-11 w-full gap-2 sm:w-auto"
              disabled={isPending}
              onClick={onConfirmGraduated}
            >
              {isPending ? (
                <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
              ) : (
                <GraduationCap className="h-4 w-4" aria-hidden="true" />
              )}
              I graduated
            </Button>
          </section>

          <section className="rounded-md border border-white/10 bg-background/60 p-4">
            <div className="flex items-start gap-3">
              <CalendarClock
                className="mt-0.5 h-5 w-5 shrink-0 text-primary"
                aria-hidden="true"
              />
              <div>
                <h2 className="font-semibold">My graduation date changed</h2>
                <p className="mt-1 text-sm leading-5 text-muted-foreground">
                  Choose your new expected term. It must be in the future.
                </p>
              </div>
            </div>
            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              <div className="grid gap-2">
                <Label htmlFor="alumni-grad-term">Graduation term</Label>
                <select
                  id="alumni-grad-term"
                  name="gradTerm"
                  className="h-11 rounded-md border border-input bg-background px-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  disabled={isPending}
                  value={gradTerm}
                  onChange={(event) =>
                    setGradTerm(
                      event.target.value as (typeof GRAD_TERMS)[number],
                    )
                  }
                >
                  {GRAD_TERMS.map((term) => (
                    <option key={term}>{term}</option>
                  ))}
                </select>
              </div>
              <div className="grid gap-2">
                <Label htmlFor="alumni-grad-year">Graduation year</Label>
                <Input
                  id="alumni-grad-year"
                  name="gradYear"
                  type="number"
                  min={new Date().getFullYear()}
                  max={2100}
                  className="h-11 bg-background"
                  disabled={isPending}
                  value={gradYear}
                  onChange={(event) => setGradYear(Number(event.target.value))}
                />
              </div>
            </div>
            <Button
              type="button"
              variant="outline"
              className="mt-4 min-h-11 w-full"
              disabled={isPending}
              onClick={() => onExtendGraduation({ gradTerm, gradYear })}
            >
              Update graduation date
            </Button>
          </section>
        </div>

        <DialogFooter className="border-t border-border/70 px-5 py-3 sm:px-6">
          <p className="w-full text-left text-xs leading-5 text-muted-foreground">
            You can update your graduation date again from member settings.
          </p>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
