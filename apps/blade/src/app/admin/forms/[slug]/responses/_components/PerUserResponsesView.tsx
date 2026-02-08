"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ChevronLeft,
  ChevronRight,
  Code,
  Download,
  File,
  FileSpreadsheet,
  FileText,
  Loader2,
  X,
} from "lucide-react";

import type { FORMS } from "@forge/consts";
import { Button } from "@forge/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@forge/ui/card";
import { Separator } from "@forge/ui/separator";
import { toast } from "@forge/ui/toast";

import { api } from "~/trpc/react";

interface PerUserResponsesViewProps {
  formData: FORMS.FormType;
  responses: {
    id: string;
    submittedAt: Date;
    responseData: Record<string, unknown>;
    member: {
      firstName: string;
      lastName: string;
      email: string;
      id: string;
    } | null;
  }[];
}

interface GroupedResponse {
  id: string;
  member: {
    firstName: string;
    lastName: string;
    email: string;
    id: string;
  };
  submittedAt: Date;
  responseData: Record<string, unknown>;
}

export function PerUserResponsesView({
  formData,
  responses,
}: PerUserResponsesViewProps) {
  const groupedByUser = responses.reduce(
    (acc, response) => {
      if (!response.member) {
        const anonymousKey = "anonymous";
        if (!acc[anonymousKey]) {
          acc[anonymousKey] = [];
        }
        acc[anonymousKey].push({
          id: response.id,
          member: {
            firstName: "Anonymous",
            lastName: "",
            email: "N/A",
            id: anonymousKey,
          },
          submittedAt: response.submittedAt,
          responseData: response.responseData,
        });
        return acc;
      }

      const userId = response.member.id;
      if (!acc[userId]) {
        acc[userId] = [];
      }
      acc[userId].push({
        id: response.id,
        member: response.member,
        submittedAt: response.submittedAt,
        responseData: response.responseData,
      });
      return acc;
    },
    {} as Record<string, GroupedResponse[]>,
  );

  const users = Object.values(groupedByUser).sort((a, b) => {
    const nameA = `${a[0]?.member.firstName} ${a[0]?.member.lastName}`;
    const nameB = `${b[0]?.member.firstName} ${b[0]?.member.lastName}`;
    return nameA.localeCompare(nameB);
  });

  const [currentUserIndex, setCurrentUserIndex] = useState(0);

  if (users.length === 0) {
    return (
      <div className="mx-auto max-w-4xl">
        <div className="py-12 text-center">
          <p className="text-lg text-muted-foreground">
            No responses yet for this form.
          </p>
          <p className="mt-2 text-sm text-muted-foreground">
            Once responses are submitted, they will appear here.
          </p>
        </div>
      </div>
    );
  }

  const currentUserResponses = users[currentUserIndex] ?? [];
  const currentUser = currentUserResponses[0]?.member;

  const formatResponseValue = (value: unknown): string => {
    if (value === undefined || value === null) {
      return "—";
    }
    if (Array.isArray(value)) {
      return value.join(", ");
    }
    if (typeof value === "boolean") {
      return value ? "Yes" : "No";
    }
    if (typeof value === "string") {
      return value;
    }
    if (typeof value === "number") {
      return String(value);
    }
    if (typeof value === "object") {
      return JSON.stringify(value, null, 2);
    }
    return JSON.stringify(value);
  };

  const isLinkValue = (value: unknown, questionType: string): boolean => {
    return (
      questionType === "LINK" &&
      typeof value === "string" &&
      /^https?:\/\//.test(value)
    );
  };

  return (
    <div className="mx-auto max-w-4xl space-y-4">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>
                {currentUser
                  ? `${currentUser.firstName} ${currentUser.lastName}`
                  : "Anonymous"}
              </CardTitle>
              <p className="mt-1 text-sm text-muted-foreground">
                {currentUser?.email}
              </p>
              <p className="mt-1 text-xs text-muted-foreground">
                User {currentUserIndex + 1} of {users.length}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="icon"
                onClick={() =>
                  setCurrentUserIndex((prev) =>
                    prev > 0 ? prev - 1 : users.length - 1,
                  )
                }
                disabled={users.length <= 1}
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <Button
                variant="outline"
                size="icon"
                onClick={() =>
                  setCurrentUserIndex((prev) =>
                    prev < users.length - 1 ? prev + 1 : 0,
                  )
                }
                disabled={users.length <= 1}
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </CardHeader>
      </Card>

      {currentUserResponses.map((response, responseIndex) => (
        <Card key={responseIndex}>
          <CardHeader>
            <div className="flex items-start justify-between">
              <div>
                <CardTitle>Response #{responseIndex + 1}</CardTitle>
                <p className="mt-1 text-sm text-muted-foreground">
                  Submitted: {new Date(response.submittedAt).toLocaleString()}
                </p>
              </div>
              <DeleteResponseButton responseId={response.id} />
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {formData.questions.map((question, questionIndex) => {
              const answer = response.responseData[question.question];

              return (
                <div key={question.question}>
                  <div className="space-y-2">
                    <h4 className="whitespace-pre-line font-medium text-foreground">
                      {question.question}
                      {!question.optional && (
                        <span className="ml-1 text-red-500">*</span>
                      )}
                    </h4>
                    {question.type === "FILE_UPLOAD" &&
                    typeof answer === "string" &&
                    answer ? (
                      <FileUploadDisplay objectName={answer} />
                    ) : isLinkValue(answer, question.type) ? (
                      <Link
                        href={answer as string}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="break-words text-sm text-primary hover:underline"
                      >
                        {formatResponseValue(answer)}
                      </Link>
                    ) : (
                      <p
                        className={`break-words text-sm text-muted-foreground ${
                          question.type === "PARAGRAPH"
                            ? "whitespace-pre-wrap"
                            : ""
                        }`}
                      >
                        {formatResponseValue(answer)}
                      </p>
                    )}
                  </div>
                  {questionIndex < formData.questions.length - 1 && (
                    <Separator className="mt-4" />
                  )}
                </div>
              );
            })}
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

function DeleteResponseButton({ responseId }: { responseId: string }) {
  const router = useRouter();
  const utils = api.useUtils();

  const deleteResponse = api.forms.deleteResponse.useMutation({
    async onSuccess() {
      toast.success("Response deleted");
      await utils.forms.getResponses.invalidate();
      router.refresh();
    },
    onError() {
      toast.error("Failed to delete response");
    },
  });

  return (
    <Button
      variant="ghost"
      size="icon"
      onClick={() => deleteResponse.mutate({ id: responseId })}
      disabled={deleteResponse.isPending}
      className="text-destructive hover:bg-destructive/10 hover:text-destructive"
    >
      {deleteResponse.isPending ? (
        <Loader2 className="h-4 w-4 animate-spin" />
      ) : (
        <X className="h-4 w-4" />
      )}
    </Button>
  );
}

function FileUploadDisplay({ objectName }: { objectName: string }) {
  const [isDownloading, setIsDownloading] = useState(false);

  const fullFileName = objectName.split("/").pop() || "file";
  const cleanFileName = fullFileName.replace(/^\d+-/, "");
  const fileName = cleanFileName || fullFileName;
  const fileExtension = fileName.split(".").pop()?.toLowerCase() || "";
  const isPdf = fileExtension === "pdf";
  const isCsv = fileExtension === "csv";
  const isJson = fileExtension === "json";
  const isMarkdown = ["md", "markdown"].includes(fileExtension);
  const isText = fileExtension === "txt";

  const getFileUrlMutation = api.forms.getFileUrl.useMutation();

  const getFileIcon = () => {
    if (isPdf) return <FileText className="h-5 w-5" />;
    if (isCsv) return <FileSpreadsheet className="h-5 w-5" />;
    if (isJson || isMarkdown || isText) return <Code className="h-5 w-5" />;
    return <File className="h-5 w-5" />;
  };

  const handleView = async () => {
    if (isDownloading) return;

    setIsDownloading(true);
    try {
      const result = await getFileUrlMutation.mutateAsync({ objectName });
      if (result.viewUrl) {
        const link = document.createElement("a");
        link.href = result.viewUrl;
        link.download = fileName;
        link.target = "_blank";
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
      }
    } catch {
      toast.error("Failed to view file. Please try again.");
    } finally {
      setIsDownloading(false);
    }
  };

  return (
    <div className="flex items-center gap-2">
      {getFileIcon()}
      <span className="flex-1 truncate text-sm">{fileName}</span>
      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={handleView}
        disabled={isDownloading}
      >
        {isDownloading ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            Loading...
          </>
        ) : (
          <>
            <Download className="mr-2 h-4 w-4" />
            View
          </>
        )}
      </Button>
      {getFileUrlMutation.isError && (
        <p className="mt-1 text-xs text-destructive">
          {getFileUrlMutation.error.message}
        </p>
      )}
    </div>
  );
}
