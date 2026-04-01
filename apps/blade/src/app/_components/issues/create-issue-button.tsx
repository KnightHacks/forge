"use client";

import { Button } from "@forge/ui/button";

import { CreateEditDialog } from "~/app/_components/issues/create-edit-dialog";
import { api } from "~/trpc/react";

export function CreateIssueButton() {
  const utils = api.useUtils();
  const createIssue = api.issues.createIssue.useMutation({
    onSuccess: async () => {
      await utils.issues.getAllIssues.invalidate();
    },
  });

  return (
    <CreateEditDialog
      intent="create"
      onSubmit={(values) =>
        createIssue.mutate({ // look for better alternative - mutation expects Date but dialog allows string
          ...values,
          date:
            values.date instanceof Date ? values.date : new Date(values.date),
        })
      }
    >
      <Button>Create issue</Button>
    </CreateEditDialog>
  );
}
