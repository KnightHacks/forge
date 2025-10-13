"use client";
import { Search } from "lucide-react";
import { Input } from "@forge/ui/input";

export function SearchBar() {
  return (
    <div className="relative w-full mb-4">
      <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
      <Input placeholder="Search..." className="pl-8" />
    </div>
  );
}