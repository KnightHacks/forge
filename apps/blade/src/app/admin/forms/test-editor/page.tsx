"use client";

import { useState } from "react";

import type { FormQuestion } from "~/lib/types/form";
import { QuestionEditCard } from "~/components/admin/forms/question-edit-card";

// Replaced uuid import with native crypto.randomUUID for simplicity and to avoid adding dependencies
// import { v4 as uuidv4 } from "uuid";
const uuidv4 = () => crypto.randomUUID();

export default function TestEditorPage() {
  const [question, setQuestion] = useState<FormQuestion>({
    id: uuidv4(),
    title: "Untitled Question",
    type: "multiple_choice",
    required: false,
    options: [{ id: uuidv4(), value: "Option 1", isOther: false }],
  });

  const handleUpdate = (updatedQuestion: FormQuestion) => {
    console.log("Updated Question:", updatedQuestion);
    setQuestion(updatedQuestion);
  };

  const handleDelete = (id: string) => {
    console.log("Delete Question:", id);
    alert("Delete clicked for id: " + id);
  };

  const handleDuplicate = (q: FormQuestion) => {
    console.log("Duplicate Question:", q);
    alert("Duplicate clicked");
  };

  return (
    <div className="flex min-h-screen items-start justify-center bg-muted/30 p-8">
      <div className="w-full max-w-3xl space-y-6">
        <div className="rounded-t-lg border-t-8 border-primary bg-card p-6 shadow-sm">
          <h1 className="text-3xl font-bold tracking-tight">
            Ripoff Google Form by KH test
          </h1>
          <p className="mt-2 text-muted-foreground">
            Welcome to the awesome bootleg google form by KH mindblown emoji*
          </p>
        </div>

        <div className="bg-transparent">
          <QuestionEditCard
            question={question}
            isActive={true}
            onUpdate={handleUpdate}
            onDelete={handleDelete}
            onDuplicate={handleDuplicate}
          />
        </div>
      </div>

      {/* <div className="p-4 bg-card rounded-md border shadow-sm">
                <h2 className="text-lg font-semibold mb-2">Current State (Debug)</h2>
                <pre className="text-xs overflow-auto max-h-96 text-muted-foreground font-mono bg-muted p-4 rounded">
                    {JSON.stringify(question, null, 2)}
                </pre>
            </div> */}
    </div>
  );
}
