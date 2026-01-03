"use client";

import { useState } from "react";
import { api } from "~/trpc/react";
import { Card } from "@forge/ui/card"; 
import { Button } from "@forge/ui/button";
import { QuestionResponseCard } from "~/app/forms/[formName]/_components/question-response-card";
import type { FormType } from "@forge/consts/knight-hacks";

interface FormResponderClientProps {
  formName: string;
}

export function FormResponderClient({ formName }: FormResponderClientProps) {
  const [responses, setResponses] = useState<Record<string, string | string[] | number | Date | null>>({});

  const formQuery = api.forms.getForm.useQuery({ 
    name: formName,
  });  

  const submitResponse = api.forms.createResponse.useMutation({});

  if (formQuery.isLoading) return <div className="min-h-screen bg-primary/5 p-6 flex items-center justify-center">Loading</div>;
  if (formQuery.error) return <div className="min-h-screen bg-primary/5 p-6 flex items-center justify-center">Error loading form</div>;

  const form = formQuery.data?.formData as FormType | undefined;

  if (!form) return <div className="min-h-screen bg-primary/5 p-6 flex items-center justify-center">Form not found</div>;

  const handleResponseChange = (questionText: string, value: string | string[] | number | Date | null) => {
    setResponses((prev) => ({
      ...prev,
      [questionText]: value,
    }));
  };

  const handleSubmit = () => {
    // Build response data object
    const responseData: Record<string, unknown> = {};
    
    form.questions.forEach((question) => {
      const response = responses[question.question];
      
      // Only include non-empty responses
      if (response !== null && response !== undefined && response !== "") {
        if (Array.isArray(response) && response.length === 0) {
          return; // Skip empty arrays
        }
        // Convert Date objects to ISO strings
        if (response instanceof Date) {
          if (question.type === "DATE") {
            responseData[question.question] = response.toISOString().split("T")[0];
          } else if (question.type === "TIME") {
            responseData[question.question] = response.toTimeString().slice(0, 5); 
          }
        } else {
          responseData[question.question] = response;
        }
      }
    });

    submitResponse.mutate({
      form: formName,
      responseData,
    });
  };

  const isFormValid = () => {
    // Check if all required questions have responses
    return form.questions.every((question) => {
      if (question.optional) return true; // Optional questions don't need validation
      
      const response = responses[question.question];
      if (response === null || response === undefined || response === "") return false;
      if (Array.isArray(response) && response.length === 0) return false;
      return true;
    });
  };
  
  return (
    <div className="min-h-screen bg-primary/5 p-6"> 
      <div className="mx-auto max-w-3xl space-y-6">
        
        {/* Banner */}
        {form.banner && (
          <div className="overflow-hidden rounded-lg">
            
          </div>
        )}

        {/* Header */}
        <Card className="border-t-8 border-t-primary">
          <div className="space-y-2 p-6">
            <h1 className="text-3xl font-bold">
              {form.name}
            </h1>

            {form.description && (
              <p className="text-muted-foreground">
                {form.description}
              </p>
            )}
          </div>
        </Card>

        {/* Questions */}
        <div className="space-y-4">
          {form.questions.map((q, index) => {
            const questionText = q.question;
            const responseValue: string | string[] | number | Date | null | undefined = responses[questionText];
            return (
              <QuestionResponseCard
                key={`${questionText}-${index}`}
                question={q}
                value={responseValue ?? null}
                onChange={(value: string | string[] | number | Date | null) => {
                  handleResponseChange(questionText, value);
                }}
              />
            );
          })}
        </div>

        {/* Action Buttons */}
        <div className="flex justify-between pt-4">
          <Button 
            onClick={handleSubmit}
            disabled={!isFormValid() || submitResponse.isPending}
            size="lg"
          >
            {submitResponse.isPending ? "Submitting..." : "Submit"}
          </Button>
        </div>
      </div>
    </div>
  );
}

