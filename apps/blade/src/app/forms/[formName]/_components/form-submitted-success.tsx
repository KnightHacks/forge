"use client";

import { CheckCircle2 } from "lucide-react";
import { Card } from "@forge/ui/card";

interface SubmissionSuccessCardProps {
  userName: string;
  formName: string;
  showCheckmark: boolean;
  showText: boolean;
  redirectCountdown: number;
}

export function SubmissionSuccessCard({
  userName,
  formName,
  showCheckmark,
  showText,
  redirectCountdown,
}: SubmissionSuccessCardProps) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-primary/5 p-6">
      <Card className="max-w-md p-8 text-center">
        {/* Checkmark */}
        <div
          className={`transition-all duration-500 ease-out ${
            showCheckmark ? "scale-100 opacity-100" : "scale-50 opacity-0"
          }`}
        >
          <CheckCircle2 className="mx-auto h-16 w-16 text-green-500" />
        </div>

        {/* Text */}
        <div
          className={`mt-4 transition-all duration-500 ease-out ${
            showText
              ? "translate-y-0 opacity-100"
              : "translate-y-4 opacity-0"
          }`}
        >
          <h1 className="mb-2 text-2xl font-bold">
            Thanks, {userName}!
          </h1>

          <p className="text-muted-foreground">
            Your response to &quot;{formName}&quot; has been recorded.
          </p>

          <p className="mt-4 text-sm text-muted-foreground">
            Redirecting in {redirectCountdown}...
          </p>
        </div>
      </Card>
    </div>
  );
}
