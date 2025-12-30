import type { Metadata } from "next";
import { auth } from "@forge/auth";
import { SIGN_IN_PATH } from "~/consts";
import { redirect } from "next/navigation";
import { api, HydrateClient } from "~/trpc/server";
import { ResponsePieChart } from "./_components/ResponsePieChart";
import { ResponseBarChart } from "./_components/ResponseBarChart";
import type { FormType } from "@forge/consts/knight-hacks";
// import { ResponsesTable } from "./_components/ResponsesTable";
import { ResponseHorizontalBarChart } from "./_components/ResponseHorizontalBarChart";

export const metadata: Metadata = {
    title: "Blade | Form Responses",
    description: "View Form Responses",
};

export default async function FormResponsesPage({
    params,
}: {
    params: {"form-id": string };
}) {

    // auth check - currently disabled for development
    // re-enable this when discord oauth is set up in production
    // const session = await auth();
    // if (!session) {
    //     redirect(SIGN_IN_PATH);
    // }

    // admin check - currently disabled for development
    // re-enable this when discord oauth is set up in production
    // const isAdmin = await api.auth.getAdminStatus();
    // if (!isAdmin) {
    //     redirect("/");
    // }

    // get the form id from the url parameter
    const formId = params["form-id"];

    // todo for backend integration:
    // 1. replace this mock data with: const apiResponses = await api.forms.getResponses({ form: formId });
    // 2. add type assertion: const responses = apiResponses as Array<{...}>; (see original code)
    // 3. make sure database connection is working (check .env file)
    // 4. change adminProcedure back in packages/api/src/routers/forms.ts line 118 ( i might have done this already but just in case )
    // 5. re-enable auth checks above
    // mock data for development - matches the structure the api will return

    const responses = [
        {
            submittedAt: new Date("2024-01-15"),
            member: { firstName: "John", lastName: "Doe", email: "john@example.com", id: "1" },
            responseData: [
                { question: "What is your favorite programming language?", type: "MULTIPLE_CHOICE", answer: "JavaScript" },
                { question: "How many years of experience do you have?", type: "LINEAR_SCALE", answer: 3 },
                { question: "What is your skill level?", type: "MULTIPLE_CHOICE", answer: "Intermediate" },
                { question: "Rate your experience (1-5)", type: "LINEAR_SCALE", answer: 4 },
                { question: "Which programming languages do you know?", type: "CHECKBOX", answer: ["JavaScript", "TypeScript", "Python"] }
            ]
        },
        {
            submittedAt: new Date("2024-01-16"),
            member: { firstName: "Jane", lastName: "Smith", email: "jane@example.com", id: "2" },
            responseData: [
                { question: "What is your favorite programming language?", type: "MULTIPLE_CHOICE", answer: "Python" },
                { question: "How many years of experience do you have?", type: "LINEAR_SCALE", answer: 5 },
                { question: "What is your skill level?", type: "MULTIPLE_CHOICE", answer: "Advanced" },
                { question: "Rate your experience (1-5)", type: "LINEAR_SCALE", answer: 5 },
                { question: "Which programming languages do you know?", type: "CHECKBOX", answer: ["Python", "Java", "C++", "Go"] }
            ]
        },
        {
            submittedAt: new Date("2024-01-17"),
            member: { firstName: "Bob", lastName: "Johnson", email: "bob@example.com", id: "3" },
            responseData: [
                { question: "What is your favorite programming language?", type: "MULTIPLE_CHOICE", answer: "JavaScript" },
                { question: "How many years of experience do you have?", type: "LINEAR_SCALE", answer: 2 },
                { question: "What is your skill level?", type: "MULTIPLE_CHOICE", answer: "Beginner" },
                { question: "Rate your experience (1-5)", type: "LINEAR_SCALE", answer: 3 },
                { question: "Which programming languages do you know?", type: "CHECKBOX", answer: ["JavaScript", "HTML", "CSS"] }
            ]
        },
        {
            submittedAt: new Date("2024-01-18"),
            member: { firstName: "Alice", lastName: "Williams", email: "alice@example.com", id: "4" },
            responseData: [
                { question: "What is your favorite programming language?", type: "MULTIPLE_CHOICE", answer: "TypeScript" },
                { question: "How many years of experience do you have?", type: "LINEAR_SCALE", answer: 4 },
                { question: "What is your skill level?", type: "MULTIPLE_CHOICE", answer: "Intermediate" },
                { question: "Rate your experience (1-5)", type: "LINEAR_SCALE", answer: 4 },
                { question: "Which programming languages do you know?", type: "CHECKBOX", answer: ["TypeScript", "JavaScript", "Python", "Rust"] }
            ]
        },
        {
            submittedAt: new Date("2024-01-19"),
            member: { firstName: "Charlie", lastName: "Brown", email: "charlie@example.com", id: "5" },
            responseData: [
                { question: "What is your favorite programming language?", type: "MULTIPLE_CHOICE", answer: "Python" },
                { question: "How many years of experience do you have?", type: "LINEAR_SCALE", answer: 1 },
                { question: "What is your skill level?", type: "MULTIPLE_CHOICE", answer: "Beginner" },
                { question: "Rate your experience (1-5)", type: "LINEAR_SCALE", answer: 2 },
                { question: "Which programming languages do you know?", type: "CHECKBOX", answer: ["Python"] }
            ]
        },
        {
            submittedAt: new Date("2024-01-20"),
            member: { firstName: "David", lastName: "Davis", email: "david@example.com", id: "6" },
            responseData: [
                { question: "What is your favorite programming language?", type: "MULTIPLE_CHOICE", answer: "JavaScript" },
                { question: "How many years of experience do you have?", type: "LINEAR_SCALE", answer: 3 },
                { question: "What is your skill level?", type: "MULTIPLE_CHOICE", answer: "Intermediate" },
                { question: "Rate your experience (1-5)", type: "LINEAR_SCALE", answer: 5 },
                { question: "Which programming languages do you know?", type: "CHECKBOX", answer: ["JavaScript", "TypeScript", "Python", "Java"] }
            ]
        }
    ];

    return (
        <HydrateClient>
          <main className="container py-8">
              {/* page header with title and response count */}
              <div className="mb-8">
                  <h1 className="text-3xl font-bold">Form Responses for: {formId}</h1>
                  <p className="text-muted-foreground mt-2">
                      {responses.length} {responses.length === 1 ? 'response' : 'responses'}
                  </p>
              </div>

              {/* charts section , shows aggregated data visualization */}
              {/* space-y-6 adds vertical spacing between charts */}
              {/* max-w-4xl mx-auto centers the charts and limits width */}
              <div className="space-y-6 max-w-4xl mx-auto">
                  {/* pie chart for categorical multiple choice questions */}
                  <ResponsePieChart
                      question="What is your favorite programming language?"
                      responses={responses}
                  />

                  {/* bar chart for numeric linear scale questions */}
                  <ResponseBarChart
                      question="How many years of experience do you have?"
                      responses={responses}
                  />

                  <ResponsePieChart
                      question="What is your skill level?"
                      responses={responses}
                  />

                  <ResponseBarChart
                      question="Rate your experience (1-5)"
                      responses={responses}
                  />

                  {/* horizontal bar chart for checkbox/multi-select questions */}
                  <ResponseHorizontalBarChart
                      question="Which programming languages do you know?"
                      responses={responses}
                  />
              </div>

              {/* individual responses table removed - not suitable for large datasets (700+ members) */}
              {/* table component still exists at _components/ResponsesTable.tsx if needed for small forms */}
          </main>
      </HydrateClient>
    )
}