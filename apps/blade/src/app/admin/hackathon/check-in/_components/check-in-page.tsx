"use client";

import { UserCheckIcon, WrenchIcon } from "lucide-react";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@forge/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@forge/ui/tabs";

import ScannerPopUp from "../../../club/members/_components/scanner";
import { ManualEntryForm } from "./manual-entry-form";

export function CheckInPage() {
  return (
    <div className="w-full max-w-4xl">
      <Tabs defaultValue="scanner" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="scanner" className="flex items-center gap-2">
            <WrenchIcon className="h-4 w-4" />
            QR Scanner
          </TabsTrigger>
          <TabsTrigger value="manual" className="flex items-center gap-2">
            <UserCheckIcon className="h-4 w-4" />
            Manual Entry
          </TabsTrigger>
        </TabsList>

        <TabsContent value="scanner" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <WrenchIcon className="h-5 w-5" />
                QR Code Scanner
              </CardTitle>
              <CardDescription>
                Use your device camera to scan QR codes for quick check-ins
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex justify-center">
                <ScannerPopUp eventType="Hacker" />
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="manual" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <UserCheckIcon className="h-5 w-5" />
                Manual Entry
              </CardTitle>
              <CardDescription>
                Manually enter user information for check-ins when QR scanning
                is not available
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ManualEntryForm />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
