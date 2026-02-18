"use client";

import Link from "next/link";
import { ArrowRight, ClipboardList, Loader } from "lucide-react";

import { Button } from "@forge/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@forge/ui/card";

import { DASHBOARD_ICON_SIZE } from "~/consts";
import { api } from "~/trpc/react";

export default function EarlyAccessVolunteer() {
  const formQuery = api.forms.getForms.useQuery({
    section: "Alumni",
  });

  if (formQuery.isLoading) {
    return (
      <Loader
        size={DASHBOARD_ICON_SIZE}
        className="text-[hsl(263.4_70%_50.4%)]"
      />
    );
  }

  if (formQuery.error || !formQuery.data) {
    return <div>Error</div>;
  }

  const forms = formQuery.data.forms;

  return (
    <Card className="overflow-hidden px-4">
      <CardHeader className="px-0 pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-medium">
            Early Access: Volunteer
          </CardTitle>
          <ClipboardList
            size={DASHBOARD_ICON_SIZE}
            className="text-[hsl(263.4_70%_50.4%)]"
          />
        </div>
      </CardHeader>

      <CardContent className="px-0 pb-4">
        <p className="mb-3 text-[12px] text-muted-foreground">
          Fill out a form to help us match you with opportunities.
        </p>

        <div className="space-y-2">
          {forms.length > 0 ? (
            forms.map((f) => (
              <Button
                key={f.slugName}
                asChild
                variant="outline"
                className="h-auto w-full justify-between py-3"
              >
                <Link href={`/forms/${f.slugName}`} className="min-w-0">
                  <div className="min-w-0 text-left">
                    <div className="whitespace-normal break-words text-sm font-medium leading-snug">
                      {f.slugName}
                    </div>
                  </div>
                </Link>
              </Button>
            ))
          ) : (
            <p className="mt-3 text-[11px] text-muted-foreground">
              More opportunities coming soon.
            </p>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
