"use client";

import { useState } from "react";
import Link from "next/link";

import { Button } from "@forge/ui/button";
import {
  Card,
  CardAction,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@forge/ui/card";

import { api } from "~/trpc/react";
import { DeleteFormDialog } from "./delete-form-dialog";

export function FormCard({
  slug_name,
  createdAt,
  onOpen,
}: {
  slug_name: string;
  createdAt: string | Date;
  onOpen?: () => void;
}) {
  const createdDate = new Date(createdAt).toLocaleString();
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);

  const { data: fullForm } = api.forms.getForm.useQuery({ slug_name });

  return (
    <Card
      role="button"
      tabIndex={0}
      onClick={() => {
        if (!deleteDialogOpen) onOpen?.();
      }}
      onKeyDown={(e) => {
        if (!deleteDialogOpen && (e.key === "Enter" || e.key === " ")) {
          e.preventDefault();
          onOpen?.();
        }
      }}
      className="cursor-pointer rounded-lg transition hover:bg-card/60 hover:shadow-md hover:ring-2 hover:ring-primary/40 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary"
    >
      <CardHeader className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <CardTitle className="truncate text-base font-medium">
            {slug_name}
          </CardTitle>
        </div>
        <CardAction>
          <CardAction>
            <DeleteFormDialog
              slug_name={slug_name}
              onOpenChange={setDeleteDialogOpen}
            />
          </CardAction>
        </CardAction>
      </CardHeader>

      <CardContent>
        <p className="max-h-12 overflow-hidden text-sm text-muted-foreground">
          {/* eslint-disable-next-line @typescript-eslint/no-unnecessary-condition */}
          {fullForm?.formData.description || "No description"}
        </p>
      </CardContent>

      <CardFooter className="flex items-center justify-between">
        <div className="text-sm text-muted-foreground">
          Created {createdDate}
        </div>
      </CardFooter>

      <div className="flex w-full justify-center gap-4">
        <Button className="w-[40%]" onClick={(e) => e.stopPropagation()}>
          {" "}
          <Link href={`/admin/forms/${slug_name}/responses`}>
            {" "}
            Responses{" "}
          </Link>{" "}
        </Button>
        <Button className="w-[40%]" onClick={(e) => e.stopPropagation()}>
          {" "}
          <Link href={`/admin/forms/${slug_name}`}> Edit Form </Link>{" "}
        </Button>
      </div>
    </Card>
  );
}
