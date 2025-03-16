import { Info } from "lucide-react";

import { Card, CardContent, CardHeader, CardTitle } from "@forge/ui/card";

import { QRCodePopup } from "~/app/_components/navigation/user-qr-code";
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
        <div className="grid grid-cols-1 gap-4">
          <ResumeButton />
          <QRCodePopup />
        </div>
      </CardContent>
    </Card>
  );
}
