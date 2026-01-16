"use client";

import { useState } from "react";
import { Download, Loader2 } from "lucide-react";

import { Button } from "@forge/ui/button";
import { toast } from "@forge/ui/toast";

import { responsesToCsv } from "~/lib/response-to-csv";

interface Member {
  firstName?: string | null;
  lastName?: string | null;
  email?: string | null;
  id?: string;
}

export interface ResponseForCsv {
  submittedAt: Date | string;
  responseData: Record<string, unknown>;
  member?: Member | null;
}

interface ExportResponsesButtonProps {
  formId: string;
  formName?: string;
  responses: ResponseForCsv[];
  questions?: string[];
  iconOnly?: boolean;
}

export const ExportResponsesButton: React.FC<ExportResponsesButtonProps> = ({
  formId,
  formName,
  responses,
  questions,
  iconOnly = false,
}) => {
  const [loading, setLoading] = useState(false);

  const handleExport = () => {
    if (responses.length === 0) {
      toast.warning("No responses to export.");
      return;
    }

    setLoading(true);

    try {
      const csv = responsesToCsv(responses, questions);
      const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
      const url = URL.createObjectURL(blob);

      const now = new Date();
      const pad = (n: number) => n.toString().padStart(2, "0");
      const timestamp = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(
        now.getDate(),
      )}_${pad(now.getHours())}-${pad(now.getMinutes())}-${pad(now.getSeconds())}`;

      const rawName = formName?.trim() ? formName : formId;
      const safeName = String(rawName)
        .replace(/[^\w\s-]/g, "")
        .replace(/\s+/g, "-")
        .slice(0, 200);

      const a = document.createElement("a");
      a.href = url;
      a.download = `${safeName}-responses-${timestamp}.csv`;
      a.click();

      URL.revokeObjectURL(url);
      toast.success("CSV download started");
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : JSON.stringify(err);
      toast.error(`Failed to export CSV: ${message}`);
    } finally {
      setLoading(false);
    }
  };
  const isEmpty = responses.length === 0;
  const disabled = loading || isEmpty;
  const title = isEmpty ? "No responses to export" : undefined;

  const buttonProps = iconOnly
    ? {
        size: "icon" as const,
        variant: "ghost" as const,
        "aria-label": "Export CSV",
        title,
        className: "h-8 w-8",
      }
    : { variant: "outline" as const, title };

  return (
    <Button onClick={handleExport} disabled={disabled} {...buttonProps}>
      {loading ? (
        <Loader2
          className={iconOnly ? "h-4 w-4 animate-spin" : "mr-2 animate-spin"}
        />
      ) : (
        <Download className={iconOnly ? "h-4 w-4" : "mr-2"} />
      )}
      {!iconOnly && "Export CSV"}
    </Button>
  );
};
