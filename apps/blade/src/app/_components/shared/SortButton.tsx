"use client";

import { ArrowDown, ArrowUp, ArrowUpDown } from "lucide-react";

import { Button } from "@forge/ui/button";

type SortOrder = "asc" | "desc" | null;

interface SortButtonProps<SortFieldType> {
  field: SortFieldType;
  label: string;
  sortField: SortFieldType | null;
  sortOrder: SortOrder;
  setSortField: (field: SortFieldType | null) => void;
  setSortOrder: (order: SortOrder) => void;
  setActiveSort?: (sort: string) => void | null;
}

export default function SortButton<SortFieldType>({
  field,
  label,
  sortField,
  sortOrder,
  setSortField,
  setSortOrder,
  setActiveSort,
}: SortButtonProps<SortFieldType>) {
  const toggleSort = () => {
    if (field === sortField) {
      setSortOrder(
        sortOrder === "asc" ? "desc" : sortOrder === "desc" ? null : "asc",
      );
      if (sortOrder === "desc") setSortField(null);
    } else {
      setSortField(field);
      setSortOrder("asc");
    }
  };

  let Icon = ArrowUpDown;
  if (sortField === field) {
    Icon =
      sortOrder === "asc"
        ? ArrowUp
        : sortOrder === "desc"
          ? ArrowDown
          : ArrowUpDown;
  }

  return (
    <Button
      variant="ghost"
      onClick={() => {
        toggleSort();
        if (setActiveSort) {
          setActiveSort("field");
        }
      }}
      className="h-8 px-2 lg:px-3"
    >
      {label}
      <Icon className="ml-2 h-4 w-4" />
    </Button>
  );
}
