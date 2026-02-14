import { XCircle } from "lucide-react";

import { Card } from "@forge/ui/card";

export default function FormNotFound() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-primary/5 p-6">
      <Card className="max-w-md p-8 text-center">
        <XCircle className="mx-auto mb-4 h-16 w-16 text-destructive" />
        <h1 className="mb-2 text-2xl font-bold">Form Not Found</h1>
        <p className="text-muted-foreground">
          This form doesn&apos;t exist or may have been removed.
        </p>
        <p className="mt-2 text-sm text-muted-foreground">
          Please let a team member know if you think this is an error.
        </p>
      </Card>
    </div>
  );
}
