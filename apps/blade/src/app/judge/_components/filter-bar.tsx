"use client";
import { Select, SelectTrigger, SelectValue } from "@forge/ui/select";

export function FilterBar() {
  return (
    <div className="flex flex-row justify-center items-center gap-4 mb-4">
      {["Room", "Judge", "Challenge"].map((label) => (
        <div key={label} className="flex flex-row justify-center items-center gap-2">
          <span>{label}:</span>
          <Select>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder={`Select a ${label}`} />
            </SelectTrigger>
          </Select>
        </div>
      ))}
    </div>
  );
}