"use client";

import { useState } from "react";

import { Alert, AlertDescription } from "@forge/ui/alert";
import { Button } from "@forge/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@forge/ui/card";

import CsvImporter from "~/app/_components/shared/csv-importer";
import { api } from "~/trpc/react";

export default function ControlRoomClient() {
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const utils = api.useUtils();

  const { data: rooms, isLoading } =
    api.judge.getRoomsWithSessionCounts.useQuery();

  const deleteSessionsMutation = api.judge.deleteSessionsByRoom.useMutation({
    onSuccess: (data) => {
      setSuccessMessage(`Successfully deleted ${data.deletedCount} sessions`);
      setErrorMessage(null);
      void utils.judge.getRoomsWithSessionCounts.invalidate(); // Flush session cache
    },
    onError: (error) => {
      setErrorMessage(error.message);
      setSuccessMessage(null);
    },
  });

  const handleDeleteRoom = (roomName: string) => {
    if (
      confirm(
        `Are you sure you want to delete all sessions for room "${roomName}"?`,
      )
    ) {
      deleteSessionsMutation.mutate({ roomName });
    }
  };

  const handleCsvSuccess = (data: {
    success: boolean;
    recordsProcessed: number;
    teamsCreated: number;
    challengesCreated: number;
    submissionsCreated: number;
  }) => {
    setSuccessMessage(
      `CSV Import Successful! Processed ${data.recordsProcessed} records, created ${data.teamsCreated} teams, ${data.challengesCreated} challenges, and ${data.submissionsCreated} submissions.`,
    );
    setErrorMessage(null);
  };

  const handleCsvError = (error: string) => {
    setErrorMessage(`CSV Import Error: ${error}`);
    setSuccessMessage(null);
  };

  return (
    <div className="container mx-auto space-y-8 p-6">
      <div>
        <h1 className="text-3xl font-bold">Control Room</h1>
      </div>

      {successMessage && (
        <Alert className="border-green-200 bg-green-50">
          <AlertDescription className="text-green-800">
            {successMessage}
          </AlertDescription>
        </Alert>
      )}

      {errorMessage && (
        <Alert className="border-red-200 bg-red-50">
          <AlertDescription className="text-red-800">
            {errorMessage}
          </AlertDescription>
        </Alert>
      )}

      <div className="flex items-center justify-between rounded-lg border p-4">
        <div>
          <h2 className="font-semibold">Import Competition Data</h2>
          <p className="text-sm text-gray-600">
            Upload a CSV file to add teams, challenges, and submissions
          </p>
        </div>
        <CsvImporter onSuccess={handleCsvSuccess} onError={handleCsvError} />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Active Judge Sessions by Room</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="py-8 text-center">
              <p className="text-gray-500">Loading rooms...</p>
            </div>
          ) : rooms && rooms.length > 0 ? (
            <div className="space-y-3">
              {rooms.map((room) => (
                <div
                  key={room.roomName}
                  className="transition-color flex items-center justify-between rounded-lg border p-4"
                >
                  <div className="flex-1">
                    <h3 className="text-lg font-semibold text-white">
                      {room.roomName}
                    </h3>
                    <p className="text-sm text-white">
                      {room.sessionCount} active session
                      {room.sessionCount !== 1 ? "s" : ""}
                    </p>
                  </div>
                  <Button
                    variant="destructive"
                    onClick={() => handleDeleteRoom(room.roomName)}
                    disabled={deleteSessionsMutation.isPending}
                    size="sm"
                  >
                    {deleteSessionsMutation.isPending
                      ? "Deleting..."
                      : "Delete All"}
                  </Button>
                </div>
              ))}
            </div>
          ) : (
            <div className="rounded-lg py-12 text-center">
              <p className="text-gray-500">No active judge sessions found.</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
