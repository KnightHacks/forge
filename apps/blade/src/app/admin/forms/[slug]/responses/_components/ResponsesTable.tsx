// table component for displaying responses to a single text question
// shows each person's response with name, email, and their answer
"use client";

import * as React from "react";

import { Card, CardContent, CardHeader, CardTitle } from "@forge/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@forge/ui/table";

// props - expects array of responses with member info and answer data
interface ResponsesTableProps {
  question: string; // the question text to display as the table title
  responses: {
    submittedAt: Date;
    responseData: Record<string, unknown>;
    member: {
      firstName: string;
      lastName: string;
      email: string;
      id: string;
    } | null; // null if member data is missing
  }[];
}

export function ResponsesTable({ question, responses }: ResponsesTableProps) {
  // show empty state if no responses
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
        {/* show total response count */}
        <p className="mt-1 text-sm text-muted-foreground">
          {responses.length} {responses.length === 1 ? "response" : "responses"}
        </p>
      </CardHeader>
      <CardContent>
        {/* allow horizontal scrolling if table is too wide */}
        <div className="max-h-[500px] overflow-y-auto">
          <Table>
            <TableHeader className="sticky top-0 z-10 bg-background">
              <TableRow>
                {/* fixed columns for metadata */}
                <TableHead className="min-w-[150px]">Name</TableHead>
                <TableHead className="min-w-[150px]">Email</TableHead>
                <TableHead className="min-w-[200px]">Response</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {responses.map((response, responseIndex) => {
                // get the answer for this specific question
                const answer = response.responseData[question];

                let displayValue: React.ReactNode;
                if (answer === undefined || answer === null) {
                  displayValue = "—";
                } else if (Array.isArray(answer)) {
                  displayValue = answer.join(", ");
                } else if (typeof answer === "boolean") {
                  displayValue = answer ? "Yes" : "No";
                } else if (typeof answer === "string") {
                  // Check if it's a valid URL (for LINK type questions)
                  try {
                    const url = new URL(answer);
                    displayValue = (
                      <a
                        href={url.toString()}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-primary hover:underline"
                      >
                        {answer}
                      </a>
                    );
                  } catch {
                    // Not a valid URL, just display as string (preserve newlines)
                    displayValue = (
                      <span className="whitespace-pre-wrap">{answer}</span>
                    );
                  }
                } else if (typeof answer === "object") {
                  displayValue = JSON.stringify(answer);
                } else {
                  // for primitive types (number, etc.) - safe to stringify
                  // eslint-disable-next-line @typescript-eslint/no-base-to-string
                  displayValue = String(answer);
                }

                return (
                  <TableRow key={responseIndex}>
                    {/* Name column */}
                    <TableCell>
                      {response.member
                        ? `${response.member.firstName} ${response.member.lastName}`
                        : "Anonymous"}
                    </TableCell>
                    {/* Email column */}
                    <TableCell>{response.member?.email ?? "N/A"}</TableCell>
                    {/* Response column - shows answer to this question */}
                    <TableCell className="max-w-[500px]">
                      {displayValue}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
}
