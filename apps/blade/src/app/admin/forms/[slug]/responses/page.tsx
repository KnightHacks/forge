import type { Metadata } from "next";
import { redirect } from "next/navigation";

import type { FormType } from "@forge/consts/knight-hacks";
import { auth } from "@forge/auth";

import { SIGN_IN_PATH } from "~/consts";
import { api, HydrateClient } from "~/trpc/server";
import { ResponseBarChart } from "./_components/ResponseBarChart";
import { ResponseHorizontalBarChart } from "./_components/ResponseHorizontalBarChart";
import { ResponsePieChart } from "./_components/ResponsePieChart";
import { ResponsesTable } from "./_components/ResponsesTable";

export const metadata: Metadata = {
  title: "Blade | Form Responses",
  description: "View Form Responses",
};

export default async function FormResponsesPage({
  params,
}: {
  params: { slug: string };
}) {
  const session = await auth();
  if (!session) {
    redirect(SIGN_IN_PATH);
  }

  const isAdmin = await api.auth.getAdminStatus();
  if (!isAdmin) {
    redirect("/");
  }

  // first verify form exists
  let form;
  try {
    form = await api.forms.getForm({ slug_name: params.slug });
  } catch {
    return (
      <HydrateClient>
        <main className="container py-8">
          <div className="py-12 text-center">
            <h1 className="mb-4 text-2xl font-bold">Form Not Found</h1>
            <p className="text-muted-foreground">
              The form &quot;{params.slug}&quot; does not exist.
            </p>
            <p className="mt-2 text-sm text-muted-foreground">
              Make sure you&apos;re using the correct form name. The form name
              is case sensitive and must match exactly.
            </p>
          </div>
        </main>
      </HydrateClient>
    );
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const formData = form.formData as any as FormType;

  const apiResponses = await api.forms.getResponses({ form: form.id });

  // type assertion to the correct format
  const responses = apiResponses as {
    submittedAt: Date;
    responseData: Record<string, unknown>;
    member: {
      firstName: string;
      lastName: string;
      email: string;
      id: string;
    } | null;
  }[];

  return (
    <HydrateClient>
      <main className="container py-8">
        {/* page header with title and response count */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold">Form Responses for: {form.name}</h1>
          <p className="mt-2 text-muted-foreground">
            {responses.length}{" "}
            {responses.length === 1 ? "response" : "responses"}
          </p>
        </div>

        {/* handle empty state when no responses */}
        {responses.length === 0 ? (
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
        ) : (
          <>
            {/* charts section , shows aggregated data visualization */}
            {/* space-y-6 adds vertical spacing between charts */}
            {/* max-w-4xl mx-auto centers the charts and limits width */}
            <div className="mx-auto max-w-4xl space-y-6">
              {formData.questions.map((question) => {
                // render pie chart for MULTIPLE_CHOICE or DROPDOWN questions
                if (
                  question.type === "MULTIPLE_CHOICE" ||
                  question.type === "DROPDOWN"
                ) {
                  return (
                    <ResponsePieChart
                      key={question.question}
                      question={question.question}
                      responses={responses}
                    />
                  );
                }

                // render bar chart for LINEAR_SCALE or NUMBER questions
                if (
                  question.type === "LINEAR_SCALE" ||
                  question.type === "NUMBER"
                ) {
                  return (
                    <ResponseBarChart
                      key={question.question}
                      question={question.question}
                      responses={responses}
                    />
                  );
                }

                // render horizontal bar chart for CHECKBOXES questions
                if (question.type === "CHECKBOXES") {
                  return (
                    <ResponseHorizontalBarChart
                      key={question.question}
                      question={question.question}
                      responses={responses}
                    />
                  );
                }

                return null;
              })}
            </div>

            {/* text responses section - for SHORT_ANSWER and PARAGRAPH questions */}
            {/* renders a separate table for each text-based question */}
            <div className="mx-auto mt-8 max-w-4xl space-y-6">
              {formData.questions.map((question) => {
                // render table for SHORT_ANSWER or PARAGRAPH questions
                if (
                  question.type === "SHORT_ANSWER" ||
                  question.type === "PARAGRAPH"
                ) {
                  return (
                    <ResponsesTable
                      key={question.question}
                      question={question.question}
                      responses={responses}
                    />
                  );
                }

                return null;
              })}
            </div>
          </>
        )}
      </main>
    </HydrateClient>
  );
}
