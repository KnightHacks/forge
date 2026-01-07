"use client";

import { useState } from "react";
import { Loader2, Download } from "lucide-react";
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
  responses: ResponseForCsv[];
  questions?: string[];
  /** Render as a compact icon button when true */
  iconOnly?: boolean;
}

export const ExportResponsesButton: React.FC<ExportResponsesButtonProps> = ({
  formId,
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

      const a = document.createElement("a");
      a.href = url;
      a.download = `responses-${formId}.csv`;
      a.click();

      URL.revokeObjectURL(url);
      toast.success("CSV download started");
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : JSON.stringify(err);
      toast.error(`Failed to export CSV: ${message}`);
    } finally {
      setLoading(false);
    }
  };

  const isEmpty = responses.length === 0;
  const disabled = loading || isEmpty;
  const title = isEmpty ? "No responses to export" : undefined;

  const buttonProps = iconOnly
    ? { size: "icon" as const, variant: "ghost" as const, 'aria-label': 'Export CSV', title }
    : { variant: "outline" as const, title };

  return (
    <Button onClick={handleExport} disabled={disabled} {...buttonProps}>
      {loading ? (
        <Loader2 className={iconOnly ? "animate-spin" : "animate-spin mr-2"} />
      ) : (
        <Download className={iconOnly ? "" : "mr-2"} />
      )}
      {!iconOnly && "Export CSV"}
    </Button>
  );
};
