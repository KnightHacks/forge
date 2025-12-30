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
  }

  export function ResponsesTable({ responses }: ResponsesTableProps){
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
    const questions = responses[0]?.responseData.map((q) => q.question) ?? [];

    return (
        <Card>
            <CardHeader>
                <CardTitle>Individual Responses</CardTitle>
                {/* show total response count */}
                <p className="text-sm text-muted-foreground mt-1">
                    {responses.length} {responses.length === 1 ? "response" : "responses"}
                </p>
            </CardHeader>
            <CardContent>
                {/* allow horizontal scrolling if table is too wide */}
                <div className="overflow-x-auto">
                    <Table>
                        <TableHeader>
                            <TableRow>
                                {/* fixed columns for metadata */}
                                <TableHead className="min-w-[150px]">Submitted At</TableHead>
                                <TableHead className="min-w-[150px]">Name</TableHead>
                                <TableHead className="min-w-[200px]">Email</TableHead>
                                {/* dynamic columns - one for each question */}
                                {questions.map((question,index)=> (
                                    <TableHead key={index} className="min-w-[200px]">{question}</TableHead>
                                ))}
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {/* one row per response */}
                            {responses.map((response, responseIndex) => (
                              <TableRow key={responseIndex}>
                                {/* format date nicely */}
                                <TableCell>
                                  {new Date(response.submittedAt).toLocaleDateString()}
                                </TableCell>
                                {/* show full name or "anonymous" if no member data */}
                                <TableCell>
                                  {response.member
                                    ? `${response.member.firstName} ${response.member.lastName}`
                                    : "Anonymous"}
                                </TableCell>
                                {/* show email or "n/a" if missing */}
                                <TableCell>{response.member?.email ?? "N/A"}</TableCell>
                                {/* show answer for each question */}
                                {questions.map((question, qIndex) => {
                                  // find the answer for this specific question
                                  const answer = response.responseData.find(
                                    (q) => q.question === question
                                  )?.answer;
                                  return (
                                    <TableCell key={qIndex}>
                                      {/* convert answer to string, show "—" if missing */}
                                      {answer !== undefined && answer !== null
                                        ? String(answer)
                                        : "—"}
                                    </TableCell>
                                  );
                                })}
                              </TableRow>
                            ))}
                          </TableBody>
                    </Table>
                </div>
            </CardContent>
        </Card>
    );
  }