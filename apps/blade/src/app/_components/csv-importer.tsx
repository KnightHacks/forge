"use client";

import { useRef } from "react";

import { Button } from "@forge/ui/button";

import { api } from "~/trpc/react";

export default function CsvImporter() {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const importer = api.csvImporter.import.useMutation({
    onSuccess: (data) => {
      console.log(data);
    },
  });

  const handleButtonClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files?.[0]) {
      return;
    }

    const file = e.target.files[0];

    const csvContent = await file.text();
    console.log(csvContent);

    importer.mutate({
      csvContent,
      hackathon_id: "44c8e930-9186-406e-9cfd-d40e73a9b721",
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
