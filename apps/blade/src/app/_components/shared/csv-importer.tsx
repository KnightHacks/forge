"use client";

import { useEffect, useRef } from "react";

import { Button } from "@forge/ui/button";

import { api } from "~/trpc/react";

export default function CsvImporter({
  onSuccess,
  onError,
}: {
  onSuccess?: (data: {
    success: boolean;
    recordsProcessed: number;
    teamsCreated: number;
    challengesCreated: number;
    submissionsCreated: number;
  }) => void;
  onError?: (error: string) => void;
}) {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const getCurrentHackathon = api.hackathon.getCurrentHackathon.useQuery();

  useEffect(() => {
    if (
      !getCurrentHackathon.isLoading &&
      getCurrentHackathon.data === undefined
    ) {
      onError?.("There was an error getting the current hackathon.");
    }
  }, [getCurrentHackathon.isLoading, getCurrentHackathon.data, onError]);

  const hackathon_id = getCurrentHackathon.data?.id;

  const importer = api.csvImporter.import.useMutation({
    onSuccess: (data) => {
      onSuccess?.(data);
    },
    onError: (error) => {
      onError?.(error.message);
    },
  });

  const handleButtonClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (hackathon_id === undefined) {
      onError?.("There was an error getting the current hackathon id.");
      return;
    }

    if (!e.target.files?.[0]) {
      onError?.("There was an error opening the selected file.");
      return;
    }

    const file = e.target.files[0];

    const csvContent = await file.text();

    importer.mutate({
      csvContent,
      hackathon_id: hackathon_id,
    });

    return;
  };

  return (
    <>
      <input
        ref={fileInputRef}
        type="file"
        accept=".csv"
        onChange={handleFileChange}
        className="hidden"
      />

      <Button onClick={handleButtonClick}>Import CSV</Button>
    </>
  );
}
