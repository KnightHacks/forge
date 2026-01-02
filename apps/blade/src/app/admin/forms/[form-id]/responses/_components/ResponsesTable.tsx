// table component for displaying all individual responses in spreadsheet format
// shows each person's complete response with name, email, and all their answers
"use client";

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
  filterQuestionTypes?: string[]; // optional filter to only show specific question types
  questions?: { question: string; type: string }[]; // optional: provide questions to filter
}

export function ResponsesTable({
  responses,
  filterQuestionTypes,
  questions: providedQuestions,
}: ResponsesTableProps) {
  // show empty state if no responses
  if (responses.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Individual Responses</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="py-8 text-center text-muted-foreground">
            No Responses yet.
          </p>
        </CardContent>
      </Card>
    );
  }

  // get questions from providedQuestions or extract from responseData keys
  // note: with record format, we can't get question types from responseData alone
  // so we rely on providedQuestions when filtering
  let questions: string[] = [];
  if (providedQuestions) {
    questions = filterQuestionTypes
      ? providedQuestions
          .filter((q) => filterQuestionTypes.includes(q.type))
          .map((q) => q.question)
      : providedQuestions.map((q) => q.question);
  } else if (responses.length > 0) {
    // fallback: get all keys from first response's responseData
    questions = Object.keys(responses[0]?.responseData ?? {});
  }

  // if filtering and no questions match, show empty state
  if (filterQuestionTypes && questions.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Text Responses</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="py-8 text-center text-muted-foreground">
            No text-based questions in this form.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>
          {filterQuestionTypes ? "Text Responses" : "Individual Responses"}
        </CardTitle>
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
                <TableHead className="min-w-[150px]">Discord</TableHead>
                <TableHead className="min-w-[200px]">Response</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {responses.map((response, responseIndex) => {
                // get the first filtered question's answer as the main response
                const firstQuestion =
                  questions.length > 0 ? questions[0] : null;
                const mainAnswer = firstQuestion
                  ? response.responseData[firstQuestion]
                  : null;

                let displayValue: string;
                if (mainAnswer === undefined || mainAnswer === null) {
                  displayValue = "—";
                } else if (Array.isArray(mainAnswer)) {
                  displayValue = mainAnswer.join(", ");
                } else if (typeof mainAnswer === "string") {
                  displayValue = mainAnswer;
                } else if (typeof mainAnswer === "object") {
                  displayValue = JSON.stringify(mainAnswer);
                } else {
                  // for primitive types (number, boolean, etc.) - safe to stringify
                  // eslint-disable-next-line @typescript-eslint/no-base-to-string
                  displayValue = String(mainAnswer);
                }

                return (
                  <TableRow key={responseIndex}>
                    {/* Name column */}
                    <TableCell>
                      {response.member
                        ? `${response.member.firstName} ${response.member.lastName}`
                        : "Anonymous"}
                    </TableCell>
                    {/* Discord column - using email username as placeholder */}
                    <TableCell>
                      {response.member?.email
                        ? response.member.email.split("@")[0]
                        : "N/A"}
                    </TableCell>
                    {/* Response column - shows answer to the filtered question */}
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
