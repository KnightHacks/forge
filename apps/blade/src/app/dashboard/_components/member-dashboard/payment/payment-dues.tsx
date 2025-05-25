import { CreditCard } from "lucide-react";

import { Card, CardContent, CardHeader, CardTitle } from "@forge/ui/card";

import { DASHBOARD_ICON_SIZE } from "~/consts";
import PaymentButton from "./payment-button";
import type { InsertMember } from "@forge/db/schemas/knight-hacks";

export function Payment({ status, member }: { status: boolean, member: InsertMember }) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">Dues</CardTitle>
        <CreditCard color="hsl(263.4 70% 50.4%)" size={DASHBOARD_ICON_SIZE} />
      </CardHeader>
      <CardContent>
        <div className="flex flex-row items-center justify-between">
          <div
            className={`text-2xl font-bold ${status ? "text-green-600" : "text-red-600"}`}
          >
            {status ? "Paid" : "Not Paid"}
          </div>
          {!status && <PaymentButton member={member} />}
        </div>
        <p className="text-xs text-muted-foreground">Current Fall & Spring</p>
      </CardContent>
    </Card>
  );
}
