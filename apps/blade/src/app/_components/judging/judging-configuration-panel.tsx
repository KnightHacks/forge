"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowDown, ArrowUp, Plus, Trash2 } from "lucide-react";

import type { RouterOutputs } from "@forge/api";
import { Alert, AlertDescription, AlertTitle } from "@forge/ui/alert";
import { Badge } from "@forge/ui/badge";
import { Button } from "@forge/ui/button";
import { Input } from "@forge/ui/input";
import { Label } from "@forge/ui/label";
import { Switch } from "@forge/ui/switch";
import { Textarea } from "@forge/ui/textarea";
import { toast } from "@forge/ui/toast";

import { api } from "~/trpc/react";

type ControlData = RouterOutputs["judging"]["listAdmin"];
type RubricItem = ControlData["rubric"][number];

const kh8Seed = [
  "Originality",
  "Design",
  "Technical understanding",
  "Implementation",
  "Wow factor",
];

function newRating(label = "New rating"): RubricItem {
  return {
    description: "",
    guestVisibilityPolicy: null,
    id: crypto.randomUUID(),
    kind: "rating",
    label,
    memberVisibilityPolicy: null,
    required: true,
  };
}

function newResponse(): RubricItem {
  return {
    description: "",
    guestVisibilityPolicy: "public_optional",
    id: crypto.randomUUID(),
    kind: "short_response",
    label: "Feedback",
    memberVisibilityPolicy: "public",
    required: false,
  };
}

export function JudgingConfigurationPanel({ data }: { data: ControlData }) {
  const router = useRouter();
  const [items, setItems] = useState(data.rubric);
  const saveRubric = api.judging.saveRubric.useMutation();
  const setState = api.judging.setJudgingState.useMutation();
  const setResults = api.judging.setDisplayAllResults.useMutation();
  const rubricLocked = data.configuration.state !== "draft";

  function updateItem(id: string, patch: Partial<RubricItem>) {
    setItems((current) =>
      current.map((item) => (item.id === id ? { ...item, ...patch } : item)),
    );
  }

  function moveItem(index: number, direction: -1 | 1) {
    const target = index + direction;
    if (target < 0 || target >= items.length) return;
    const next = [...items];
    const current = next[index];
    const replacement = next[target];
    if (!current || !replacement) return;
    next[index] = replacement;
    next[target] = current;
    setItems(next);
  }

  async function save() {
    try {
      await saveRubric.mutateAsync({
        hackathonId: data.hackathon.id,
        items,
      });
      toast.success("Rubric saved.");
      router.refresh();
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Rubric save failed.",
      );
    }
  }

  async function changeState(state: "closed" | "open") {
    try {
      await setState.mutateAsync({ hackathonId: data.hackathon.id, state });
      toast.success(
        state === "open" ? "Judging is open." : "Judging is closed.",
      );
      router.refresh();
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "State update failed.",
      );
    }
  }

  return (
    <div className="space-y-4">
      <section className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(18rem,24rem)]">
        <div className="rounded-lg border border-white/10 bg-card/95 p-4 shadow-xl shadow-black/15 sm:p-5">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-semibold">Judging state</h2>
                <Badge
                  variant={
                    data.configuration.state === "open" ? "default" : "outline"
                  }
                >
                  {data.configuration.state[0]?.toUpperCase()}
                  {data.configuration.state.slice(1)}
                </Badge>
              </div>
              <p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">
                Draft blocks submissions. Open accepts new and edited scores.
                Closed keeps every submission readable but locks changes.
              </p>
            </div>
            <div className="flex gap-2">
              {data.configuration.state === "open" ? (
                <Button
                  disabled={setState.isPending}
                  onClick={() => void changeState("closed")}
                  variant="outline"
                >
                  Close judging
                </Button>
              ) : (
                <Button
                  disabled={setState.isPending}
                  onClick={() => void changeState("open")}
                >
                  {data.configuration.state === "closed" ? "Reopen" : "Open"}{" "}
                  judging
                </Button>
              )}
            </div>
          </div>
        </div>

        <div className="rounded-lg border border-white/10 bg-card/95 p-4 shadow-xl shadow-black/15 sm:p-5">
          <div className="flex items-start justify-between gap-4">
            <div>
              <Label htmlFor="display-results">Display all results</Label>
              <p className="mt-2 text-sm leading-6 text-muted-foreground">
                Reveal scoped ratings to authenticated judges before they
                submit. Guest judges stay gated.
              </p>
            </div>
            <Switch
              checked={data.configuration.displayAllResults}
              disabled={setResults.isPending}
              id="display-results"
              onCheckedChange={async (checked) => {
                try {
                  await setResults.mutateAsync({
                    displayAllResults: checked,
                    hackathonId: data.hackathon.id,
                  });
                  toast.success(
                    checked ? "Results revealed." : "Results gated.",
                  );
                  router.refresh();
                } catch (error) {
                  toast.error(
                    error instanceof Error
                      ? error.message
                      : "Result visibility update failed.",
                  );
                }
              }}
            />
          </div>
        </div>
      </section>

      {rubricLocked ? (
        <Alert>
          <AlertTitle>Rubric locked</AlertTitle>
          <AlertDescription>
            The rubric cannot change after judging opens. Close and reopen
            judging without changing the questions.
          </AlertDescription>
        </Alert>
      ) : null}

      <section className="rounded-lg border border-white/10 bg-card/95 shadow-2xl shadow-black/20">
        <header className="flex flex-col gap-3 border-b border-border/70 p-4 sm:flex-row sm:items-center sm:justify-between sm:p-5">
          <div>
            <h2 className="text-lg font-semibold">Rubric</h2>
            <p className="mt-1 text-sm leading-6 text-muted-foreground">
              Add any number of 1 through 5 ratings and written responses.
              Project scores average every rating answer.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            {!items.length ? (
              <Button
                disabled={rubricLocked}
                onClick={() => setItems(kh8Seed.map(newRating))}
                size="sm"
                variant="outline"
              >
                Use KH8 criteria
              </Button>
            ) : null}
            <Button
              disabled={rubricLocked}
              onClick={() => setItems((current) => [...current, newRating()])}
              size="sm"
              variant="outline"
            >
              <Plus className="mr-2 size-4" aria-hidden="true" /> Rating
            </Button>
            <Button
              disabled={rubricLocked}
              onClick={() => setItems((current) => [...current, newResponse()])}
              size="sm"
              variant="outline"
            >
              <Plus className="mr-2 size-4" aria-hidden="true" /> Response
            </Button>
          </div>
        </header>

        {items.length ? (
          <div className="divide-y divide-border/60">
            {items.map((item, index) => (
              <article
                className="grid gap-3 p-4 sm:p-5 lg:grid-cols-[auto_minmax(0,1fr)_14rem_auto]"
                key={item.id}
              >
                <div className="flex gap-1">
                  <Button
                    aria-label={`Move ${item.label} up`}
                    disabled={rubricLocked || index === 0}
                    onClick={() => moveItem(index, -1)}
                    size="icon"
                    type="button"
                    variant="ghost"
                  >
                    <ArrowUp className="size-4" aria-hidden="true" />
                  </Button>
                  <Button
                    aria-label={`Move ${item.label} down`}
                    disabled={rubricLocked || index === items.length - 1}
                    onClick={() => moveItem(index, 1)}
                    size="icon"
                    type="button"
                    variant="ghost"
                  >
                    <ArrowDown className="size-4" aria-hidden="true" />
                  </Button>
                </div>
                <div className="grid gap-3">
                  <Input
                    aria-label="Rubric item label"
                    disabled={rubricLocked}
                    maxLength={120}
                    onChange={(event) =>
                      updateItem(item.id, { label: event.target.value })
                    }
                    value={item.label}
                  />
                  <Textarea
                    aria-label={`${item.label} description`}
                    className="min-h-20"
                    disabled={rubricLocked}
                    maxLength={500}
                    onChange={(event) =>
                      updateItem(item.id, { description: event.target.value })
                    }
                    placeholder="What should judges consider?"
                    value={item.description}
                  />
                </div>
                <div className="space-y-3">
                  <Badge variant="secondary">
                    {item.kind === "rating" ? "1–5 rating" : "Written response"}
                  </Badge>
                  {item.kind === "short_response" ? (
                    <div className="space-y-3">
                      <label className="block space-y-2 text-sm">
                        <span className="font-medium">Guest feedback</span>
                        <select
                          className="h-11 w-full rounded-md border border-input bg-background px-3"
                          disabled={rubricLocked}
                          onChange={(event) =>
                            updateItem(item.id, {
                              guestVisibilityPolicy: event.target.value as
                                | "private"
                                | "public"
                                | "public_optional",
                            })
                          }
                          value={
                            item.guestVisibilityPolicy ?? "public_optional"
                          }
                        >
                          <option value="private">
                            Never share with hackers
                          </option>
                          <option value="public_optional">
                            Guest chooses hacker visibility
                          </option>
                          <option value="public">
                            Always share with hackers
                          </option>
                        </select>
                        <span className="block text-xs leading-5 text-muted-foreground">
                          Authenticated judge feedback is always shared with
                          hackers.
                        </span>
                      </label>
                      <Label className="flex min-h-11 items-center justify-between gap-3 rounded-md border border-white/10 px-3">
                        Required response
                        <Switch
                          checked={item.required}
                          disabled={rubricLocked}
                          onCheckedChange={(required) =>
                            updateItem(item.id, { required })
                          }
                        />
                      </Label>
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground">
                      Required integer score from 1 through 5.
                    </p>
                  )}
                </div>
                <Button
                  aria-label={`Remove ${item.label}`}
                  disabled={rubricLocked}
                  onClick={() =>
                    setItems((current) =>
                      current.filter((candidate) => candidate.id !== item.id),
                    )
                  }
                  size="icon"
                  type="button"
                  variant="ghost"
                >
                  <Trash2 className="size-4" aria-hidden="true" />
                </Button>
              </article>
            ))}
          </div>
        ) : (
          <p className="px-5 py-12 text-center text-sm text-muted-foreground">
            Add a rating question or start with the KH8 criteria.
          </p>
        )}

        <footer className="flex justify-end border-t border-border/70 p-4 sm:p-5">
          <Button
            disabled={rubricLocked || saveRubric.isPending}
            onClick={() => void save()}
          >
            {saveRubric.isPending ? "Saving..." : "Save rubric"}
          </Button>
        </footer>
      </section>
    </div>
  );
}
