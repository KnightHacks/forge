"use client";

import { useState } from "react";
import {
  Code,
  Download,
  File,
  FileSpreadsheet,
  FileText,
  Loader2,
} from "lucide-react";

import { Button } from "@forge/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@forge/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@forge/ui/table";
import { toast } from "@forge/ui/toast";

import { api } from "~/trpc/react";

interface FileUploadResponsesTableProps {
  question: string;
  responses: {
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

export function FileUploadResponsesTable({
  question,
  responses,
}: FileUploadResponsesTableProps) {
  if (responses.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="whitespace-pre-line">{question}</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="py-8 text-center text-muted-foreground">
            No Responses yet.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="whitespace-pre-line">{question}</CardTitle>
        <p className="mt-1 text-sm text-muted-foreground">
          {responses.length} {responses.length === 1 ? "response" : "responses"}
        </p>
      </CardHeader>
      <CardContent>
        <div className="max-h-[500px] overflow-y-auto">
          <Table>
            <TableHeader className="sticky top-0 z-10 bg-background">
              <TableRow>
                <TableHead className="min-w-[150px]">Name</TableHead>
                <TableHead className="min-w-[150px]">Email</TableHead>
                <TableHead className="min-w-[200px]">File</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {responses.map((response, responseIndex) => {
                const objectName = response.responseData[question] as
                  | string
                  | undefined;

                if (!objectName || typeof objectName !== "string") {
                  return (
                    <TableRow key={responseIndex}>
                      <TableCell>
                        {response.member
                          ? `${response.member.firstName} ${response.member.lastName}`
                          : "Anonymous"}
                      </TableCell>
                      <TableCell>{response.member?.email ?? "N/A"}</TableCell>
                      <TableCell className="max-w-[500px]">—</TableCell>
                    </TableRow>
                  );
                }

                return (
                  <FileUploadRow
                    key={responseIndex}
                    objectName={objectName}
                    member={response.member}
                  />
                );
              })}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
}

function FileUploadRow({
  objectName,
  member,
}: {
  objectName: string;
  member: {
    firstName: string;
    lastName: string;
    email: string;
    id: string;
  } | null;
}) {
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

  const handleDownload = async () => {
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
      toast.error("Failed to download file. Please try again.");
    } finally {
      setIsDownloading(false);
    }
  };

  return (
    <TableRow>
      <TableCell>
        {member ? `${member.firstName} ${member.lastName}` : "Anonymous"}
      </TableCell>
      <TableCell>{member?.email ?? "N/A"}</TableCell>
      <TableCell className="max-w-[500px]">
        <div className="flex items-center gap-2">
          {getFileIcon()}
          <span className="flex-1 truncate text-sm">{fileName}</span>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handleDownload}
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
        </div>
        {getFileUrlMutation.isError && (
          <p className="mt-1 text-xs text-destructive">
            {getFileUrlMutation.error.message}
          </p>
        )}
      </TableCell>
    </TableRow>
  );
}
