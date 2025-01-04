import { Info } from "lucide-react";

import { Button } from "@forge/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@forge/ui/card";

import { DASHBOARD_ICON_SIZE } from "~/consts";
import { ResumeButton } from "./resume-button";

export function MemberInfo() {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="text-sm font-medium">Info</CardTitle>
        <Info color="hsl(263.4 70% 50.4%)" size={DASHBOARD_ICON_SIZE} />
      </CardHeader>
      <CardContent>
        <div className="grid gap-4 md:grid-cols-1 lg:grid-cols-2">
          <ResumeButton />
          <Button>QR</Button>
        </div>
      </CardContent>
    </Card>
  );
}
