"use client";

import { useState } from "react";

import type { HackerPrintJobDto } from "@forge/hacker-sdk";
import { PRINTING } from "@forge/consts";
import { Button } from "@forge/ui/button";
import { toast } from "@forge/ui/toast";

import type { useHackerPrintingFlow } from "~/lib/hacker-portal";
import styles from "./hacker-printing.module.css";

export function PrintCategoryChoices({
  value,
  onChange,
  disabled,
  name,
}: {
  value: PRINTING.PrintJobCategory | null;
  onChange: (value: PRINTING.PrintJobCategory) => void;
  disabled: boolean;
  name: string;
}) {
  return (
    <fieldset className={styles.categoryChoices} disabled={disabled}>
      <legend>What is this print for?</legend>
      <p className={styles.hint}>
        Hackathon project parts have priority over personal prints.
      </p>
      {PRINTING.PRINT_JOB_CATEGORIES.map((category) => (
        <label key={category}>
          <input
            type="radio"
            name={name}
            value={category}
            checked={value === category}
            required
            onChange={() => onChange(category)}
          />
          <span>{PRINTING.PRINT_JOB_CATEGORY_LABELS[category]}</span>
        </label>
      ))}
    </fieldset>
  );
}

export function PrintCategoryEditor({
  job,
  flow,
  editable,
}: {
  job: HackerPrintJobDto;
  flow: ReturnType<typeof useHackerPrintingFlow>;
  editable: boolean;
}) {
  const [editing, setEditing] = useState(false);
  const [category, setCategory] = useState(job.category);
  const needsCategory = job.category === null && editable;
  const showChoices = needsCategory || editing;
  async function save() {
    if (!category) return;
    try {
      await flow.updateCategory({ jobId: job.id, category });
      setEditing(false);
      toast.success("Print category saved.");
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : "The category could not be saved.",
      );
    }
  }
  return (
    <div className={styles.categoryEditor}>
      {showChoices ? (
        <>
          {needsCategory ? (
            <p className={styles.callout}>
              <strong>Choose a category for this print.</strong> Tell us whether
              it is part of your hackathon project so we can prioritize the
              queue.
            </p>
          ) : null}
          <PrintCategoryChoices
            value={category}
            onChange={setCategory}
            disabled={flow.categoryMutation.isPending}
            name={`category-${job.id}`}
          />
          <Button
            className={styles.primaryButton}
            disabled={!category || flow.categoryMutation.isPending}
            onClick={() => void save()}
            type="button"
          >
            {flow.categoryMutation.isPending ? "Saving…" : "Save category"}
          </Button>
          {editing ? (
            <Button
              variant="ghost"
              disabled={flow.categoryMutation.isPending}
              onClick={() => setEditing(false)}
            >
              Keep category
            </Button>
          ) : null}
        </>
      ) : (
        <div className={styles.jobTop}>
          <span className={styles.hint}>
            {job.category
              ? PRINTING.PRINT_JOB_CATEGORY_LABELS[job.category]
              : "Not categorized"}
          </span>
          {editable ? (
            <Button
              variant="ghost"
              onClick={() => {
                setCategory(job.category);
                setEditing(true);
              }}
            >
              Change category
            </Button>
          ) : null}
        </div>
      )}
    </div>
  );
}
