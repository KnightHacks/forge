"use client";

import { useState } from "react";

import type { RouterOutputs } from "@forge/api";
import { PRINTING } from "@forge/consts";
import { Button } from "@forge/ui/button";
import { Label } from "@forge/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@forge/ui/select";
import { toast } from "@forge/ui/toast";

import { api } from "~/trpc/react";
import { deliverySummary } from "./print-queue-format";

type PrintJob = RouterOutputs["printing"]["list"]["jobs"][number];

export function PrintCategoryForm({
  job,
  onDone,
}: {
  job: PrintJob;
  onDone: () => void;
}) {
  const [category, setCategory] = useState(job.category);
  const update = api.printing.updateCategory.useMutation({
    onError: (error) => toast.error(error.message),
    onSuccess: (result) => {
      const summary = deliverySummary(result.delivery);
      if (summary.ok)
        toast.success("Category saved.", { description: summary.description });
      else toast.error("Category saved.", { description: summary.description });
      onDone();
    },
  });
  const editable = (
    PRINTING.HACKER_CANCELLABLE_PRINT_JOB_STATUSES as readonly string[]
  ).includes(job.status);
  if (!editable)
    return (
      <p className="text-sm text-muted-foreground">
        Category:{" "}
        {job.category
          ? PRINTING.PRINT_JOB_CATEGORY_LABELS[job.category]
          : "Uncategorized"}
      </p>
    );
  return (
    <form
      className="grid gap-3"
      onSubmit={(event) => {
        event.preventDefault();
        if (category) update.mutate({ jobId: job.id, category });
      }}
    >
      <Label htmlFor="print-category">Print category</Label>
      <p className="text-sm text-muted-foreground">
        Hackathon projects take priority over other waiting prints.
      </p>
      <Select
        value={category ?? ""}
        disabled={update.isPending}
        onValueChange={(value) => {
          if (value === "project" || value === "personal") setCategory(value);
        }}
      >
        <SelectTrigger id="print-category" className="min-h-11">
          <SelectValue placeholder="Choose a category" />
        </SelectTrigger>
        <SelectContent>
          {PRINTING.PRINT_JOB_CATEGORIES.map((value) => (
            <SelectItem key={value} value={value}>
              {PRINTING.PRINT_JOB_CATEGORY_LABELS[value]}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <Button
        className="min-h-11 justify-self-start"
        type="submit"
        variant="outline"
        disabled={!category || category === job.category || update.isPending}
      >
        {update.isPending ? "Saving…" : "Save category and notify"}
      </Button>
    </form>
  );
}
