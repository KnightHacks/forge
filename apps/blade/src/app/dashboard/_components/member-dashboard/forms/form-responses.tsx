import Link from "next/link";
import { Info } from "lucide-react";

import { Button } from "@forge/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@forge/ui/card";

import { DASHBOARD_ICON_SIZE } from "~/consts";
import { api } from "~/trpc/server";

export async function FormResponses() {
  const userFormResponeses = await api.forms.getUserResponse({});

  const hasResponses = userFormResponeses.length > 0;

  return (
    <Card className="h-full">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">Form Submissions</CardTitle>
        <Info color="hsl(263.4 70% 50.4%)" size={DASHBOARD_ICON_SIZE} />
      </CardHeader>

      {hasResponses ? (
        <CardContent className="flex-1">
          <div className="flex h-36 flex-col gap-3 overflow-y-auto">
            {userFormResponeses.map((formResponse) => (
              <div
                key={`view-response-button-${formResponse.id}`}
                className="rounded-lg border bg-muted/50 p-3 text-sm"
              >
                <div className="flex items-center justify-between">
                  <div className="flex flex-col">
                    <span className="font-medium">{formResponse.formName}</span>
                    <span className="text-xs text-muted-foreground">
                      {new Date(formResponse.submittedAt).toLocaleString()}
                    </span>
                  </div>

                  <Button asChild size="sm">
                    <Link
                      href={`/forms/${formResponse.formSlug}/${formResponse.id}`}
                    >
                      {formResponse.allowEdit ? "Edit" : "View"}
                    </Link>
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      ) : (
        <CardHeader>
          <CardTitle>
            <div className="text-sm text-gray-600">No form submissions yet</div>
          </CardTitle>
        </CardHeader>
      )}
    </Card>
  );
}
