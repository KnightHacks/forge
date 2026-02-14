"use client";

import { useState } from "react";
import Link from "next/link";
import { QrCode } from "lucide-react";

import type { FORMS } from "@forge/consts";
import { Button } from "@forge/ui/button";
import {
  Card,
  CardAction,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@forge/ui/card";

import type { ResponseForCsv } from "./export-csv";
import { api } from "~/trpc/react";
import { DeleteFormDialog } from "./delete-form-dialog";
import { ExportResponsesButton } from "./export-csv";
import { FormQRCodeDialog } from "./form-qr-code";
import { MoveFormSectionDialog } from "./move-form-section-dialog";

export function FormCard({
  slug_name,
  createdAt,
  section,
  onOpen,
}: {
  slug_name: string;
  createdAt: string | Date;
  section?: string;
  onOpen?: () => void;
}) {
  const createdDate = new Date(createdAt).toLocaleString();
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);

  const { data: fullForm } = api.forms.getForm.useQuery({ slug_name });

  const { data: responses = [] } = api.forms.getResponses.useQuery(
    { form: fullForm?.id ?? "" },
    {
      enabled: !!fullForm?.id,
      refetchOnWindowFocus: true,
    },
  );

  const _questions = (
    fullForm?.formData as { questions?: { question: string }[] } | undefined
  )?.questions;
  const questionsList = _questions
    ? _questions.map((q) => q.question)
    : undefined;

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
        <div className="min-w-0 flex-1">
          <CardTitle className="truncate text-base font-medium">
            {slug_name
              .split("-")
              .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
              .join(" ")}
          </CardTitle>

          <div className="mt-1 text-sm text-muted-foreground">
            {responses.length}{" "}
            {responses.length === 1 ? "response" : "responses"}
          </div>
        </div>

        <div className="flex shrink-0 items-center gap-1">
          <CardAction
            onClick={(e) => e.stopPropagation()}
            onKeyDown={(e) => e.stopPropagation()}
          >
            <div onClick={(e) => e.stopPropagation()}>
              <MoveFormSectionDialog
                slug_name={slug_name}
                currentSection={section}
              />
            </div>
          </CardAction>

          <CardAction
            onClick={(e) => e.stopPropagation()}
            onKeyDown={(e) => e.stopPropagation()}
          >
            <div onClick={(e) => e.stopPropagation()}>
              <ExportResponsesButton
                formId={fullForm?.id ?? slug_name}
                formName={fullForm?.name ?? slug_name}
                responses={responses as ResponseForCsv[]}
                questions={questionsList}
                iconOnly
              />
            </div>
          </CardAction>

          <CardAction
            onClick={(e) => e.stopPropagation()}
            onKeyDown={(e) => e.stopPropagation()}
          >
            <FormQRCodeDialog
              formSlug={slug_name}
              trigger={
                <Button
                  size="icon"
                  variant="ghost"
                  aria-label="View form QR code"
                  className="h-8 w-8"
                >
                  <QrCode className="h-4 w-4" />
                </Button>
              }
            />
          </CardAction>
          <CardAction>
            <DeleteFormDialog
              slug_name={slug_name}
              onOpenChange={setDeleteDialogOpen}
            />
          </CardAction>
        </div>
      </CardHeader>

      <CardContent>
        <p className="max-h-12 overflow-hidden text-sm text-muted-foreground">
          {fullForm?.formData
            ? (fullForm.formData as FORMS.FormType).description ||
              "No description"
            : "No description"}
        </p>
      </CardContent>

      <CardFooter className="flex flex-col gap-4">
        <div className="text-sm text-muted-foreground">
          Created {createdDate}
        </div>
        <div className="flex w-full gap-3">
          <Button
            asChild
            className="flex-1"
            onClick={(e) => e.stopPropagation()}
          >
            <Link
              href={`/admin/forms/${encodeURIComponent(slug_name)}/responses`}
            >
              Responses
            </Link>
          </Button>
          <Button
            asChild
            className="flex-1"
            onClick={(e) => e.stopPropagation()}
          >
            <Link href={`/admin/forms/${encodeURIComponent(slug_name)}`}>
              Edit Form
            </Link>
          </Button>
        </div>
      </CardFooter>
    </Card>
  );
}
