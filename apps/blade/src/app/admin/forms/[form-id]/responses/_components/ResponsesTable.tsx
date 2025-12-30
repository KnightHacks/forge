// table component for displaying all individual responses in spreadsheet format
// shows each person's complete response with name, email, and all their answers
"use client";

import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
  } from "@forge/ui/table";
  import { Card, CardContent, CardHeader, CardTitle } from "@forge/ui/card";

  // props - expects array of responses with member info and answer data
  interface ResponsesTableProps {
    responses: Array <{
        submittedAt: Date;
        responseData: Array <{
            question: string;
            type: string;
            answer: any;
        }>;
        member: {
            firstName: string;
            lastName: string;
            email: string;
            id: string;
        } | null;  // null if member data is missing
    }>;
    filterQuestionTypes?: string[];  // optional filter to only show specific question types
  }

  export function ResponsesTable({ responses, filterQuestionTypes }: ResponsesTableProps){
    // show empty state if no responses
    if ( responses.length === 0 ){
        return (
            <Card>
                <CardHeader>
                    <CardTitle>Individual Responses</CardTitle>
                </CardHeader>
                <CardContent>
                    <p className="text-muted-foreground text-center py-8">
                        No Responses yet.
                    </p>
                </CardContent>
            </Card>
        )
    }

    // extract all question texts from first response to use as column headers
    // assumes all responses have same questions
    // filter by question type if filterQuestionTypes is provided
    const allQuestions = responses[0]?.responseData ?? [];
    const questions = filterQuestionTypes
        ? allQuestions.filter((q) => filterQuestionTypes.includes(q.type)).map((q) => q.question)
        : allQuestions.map((q) => q.question);

    // if filtering and no questions match, show empty state
    if (filterQuestionTypes && questions.length === 0) {
        return (
            <Card>
                <CardHeader>
                    <CardTitle>Text Responses</CardTitle>
                </CardHeader>
                <CardContent>
                    <p className="text-muted-foreground text-center py-8">
                        No text-based questions in this form.
                    </p>
                </CardContent>
            </Card>
        );
    }

    return (
        <Card>
            <CardHeader>
                <CardTitle>{filterQuestionTypes ? "Text Responses" : "Individual Responses"}</CardTitle>
                {/* show total response count */}
                <p className="text-sm text-muted-foreground mt-1">
                    {responses.length} {responses.length === 1 ? "response" : "responses"}
                </p>
            </CardHeader>
            <CardContent>
                {/* allow horizontal scrolling if table is too wide */}
                <div className="max-h-[500px] overflow-y-auto">
                    <Table>
                        <TableHeader className="sticky top-0 bg-background z-10">
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
                                const mainAnswer = questions.length > 0
                                    ? response.responseData.find((q) => q.question === questions[0])?.answer
                                    : null;

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
                                            {response.member?.email?.split("@")[0] ?? "N/A"}
                                        </TableCell>
                                        {/* Response column - shows answer to the filtered question */}
                                        <TableCell className="max-w-[500px]">
                                            {mainAnswer !== undefined && mainAnswer !== null
                                                ? String(mainAnswer)
                                                : "—"}
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