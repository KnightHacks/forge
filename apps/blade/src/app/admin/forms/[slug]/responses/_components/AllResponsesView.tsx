import type { FORMS } from '@forge/consts';
import { FileUploadResponsesTable } from "./FileUploadResponsesTable";
import { ResponseBarChart } from "./ResponseBarChart";
import { ResponseHorizontalBarChart } from "./ResponseHorizontalBarChart";
import { ResponsePieChart } from "./ResponsePieChart";
import { ResponsesTable } from "./ResponsesTable";

interface AllResponsesViewProps {
  formData: FORMS.FormType;
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

export function AllResponsesView({
  formData,
  responses,
}: AllResponsesViewProps) {
  return (
    <>
      {/* charts section , shows aggregated data visualization */}
      {/* space-y-2 on mobile, space-y-6 on desktop adds vertical spacing between charts */}
      {/* max-w-4xl mx-auto centers the charts and limits width */}
      <div className="mx-auto max-w-4xl space-y-2 md:space-y-6">
        {formData.questions.map((question) => {
          // render pie chart for MULTIPLE_CHOICE, DROPDOWN, or BOOLEAN questions
          if (
            question.type === "MULTIPLE_CHOICE" ||
            question.type === "DROPDOWN" ||
            question.type === "BOOLEAN"
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
          if (question.type === "LINEAR_SCALE" || question.type === "NUMBER") {
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

      {/* text responses section - for SHORT_ANSWER, PARAGRAPH, EMAIL, PHONE, and LINK questions */}
      {/* renders a separate table for each text-based question */}
      <div className="mx-auto mt-3 max-w-4xl space-y-2 md:mt-8 md:space-y-6">
        {formData.questions.map((question) => {
          // render table for SHORT_ANSWER, PARAGRAPH, EMAIL, PHONE, or LINK questions
          if (
            question.type === "SHORT_ANSWER" ||
            question.type === "PARAGRAPH" ||
            question.type === "EMAIL" ||
            question.type === "PHONE" ||
            question.type === "LINK"
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
      {/* date and time responses section - for DATE and TIME questions */}
      {/* renders a separate table for each date/time question */}
      <div className="mx-auto mt-3 max-w-4xl space-y-2 md:mt-8 md:space-y-6">
        {formData.questions.map((question) => {
          // render table for DATE or TIME questions
          if (question.type === "DATE" || question.type === "TIME") {
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
      <div className="mx-auto mt-3 max-w-4xl space-y-2 md:mt-8 md:space-y-6">
        {formData.questions.map((question) => {
          if (question.type === "FILE_UPLOAD") {
            return (
              <FileUploadResponsesTable
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
  );
}
