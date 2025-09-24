"use client";

import React, { useState } from "react";

import type { HackerClass } from "@forge/db/schemas/knight-hacks";
import { HACKER_CLASSES } from "@forge/db/schemas/knight-hacks";
import { Button } from "@forge/ui/button";
import { toast } from "@forge/ui/toast";

import { api } from "~/trpc/react";

type Option = "none" | "all" | HackerClass;

const isHackerClass = (v: string): v is HackerClass =>
  (HACKER_CLASSES as readonly string[]).includes(v);

const RepeatDropdown = ({ hackathonId }: { hackathonId: string }) => {
  const [selectedOption, setSelectedOption] = useState<Option>("none");
  const setAllowedRepeat = api.hackathon.setAllowedRepeatCheckIn.useMutation();

  const handleChange = (event: React.ChangeEvent<HTMLSelectElement>) => {
    const v = event.target.value;
    if (v === "none" || v === "all" || isHackerClass(v)) {
      setSelectedOption(v);
    }
  };

  const handleApply = async () => {
    try {
      if (selectedOption === "none") {
        await setAllowedRepeat.mutateAsync({ hackathonId, mode: "none" });
        toast.success("Disabled repeat check-ins for everyone.");
      } else if (selectedOption === "all") {
        await setAllowedRepeat.mutateAsync({ hackathonId, mode: "all" });
        toast.success("Enabled repeat check-ins for ALL classes.");
      } else {
        await setAllowedRepeat.mutateAsync({
          hackathonId,
          mode: "class",
          cls: selectedOption,
        });
        toast.success(`Enabled repeat check-ins for class: ${selectedOption}`);
      }
    } catch {
      toast.error("Failed to update repeat check-ins.");
    }
  };

  return (
    <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
      <label htmlFor="repeat">Allow Repeat Check-Ins:</label>
      <select
        id="repeat"
        value={selectedOption}
        onChange={handleChange}
        className="rounded border p-2 dark:bg-black dark:text-white"
      >
        <option value="none">None</option>
        <option value="all">All classes</option>
        <option value="Operators">Operators</option>
        <option value="Machinist">Machinist</option>
        <option value="Sentinels">Sentinels</option>
        <option value="Harbinger">Harbinger</option>
        <option value="Beastkeeper">Beastkeeper</option>
        <option value="Alchemist">Alchemist</option>
      </select>
      <Button onClick={handleApply}>Apply</Button>
    </div>
  );
};

export default RepeatDropdown;
