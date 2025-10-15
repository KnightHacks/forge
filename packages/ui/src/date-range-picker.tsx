"use client";

import * as React from "react";
import { format } from "date-fns";
import { Calendar as CalendarIcon } from "lucide-react";

import { Button } from "@forge/ui/button";
import { Calendar } from "@forge/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@forge/ui/popover";

interface DateRangePickerProps {
  startDate?: Date;
  endDate?: Date;
  onStartDateChange: (date: Date | undefined) => void;
  onEndDateChange: (date: Date | undefined) => void;
}

export function DateRangePicker({ 
  startDate, 
  endDate, 
  onStartDateChange, 
  onEndDateChange
}: DateRangePickerProps) {
  const [isStartOpen, setIsStartOpen] = React.useState(false);
  const [isEndOpen, setIsEndOpen] = React.useState(false);

  return (
    <div className="flex items-center gap-2">
      <Popover open={isStartOpen} onOpenChange={setIsStartOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            className="w-[200px] justify-start text-left font-normal text-muted-foreground"
          >
            <CalendarIcon className="mr-2 h-4 w-4" />
            {startDate ? format(startDate, "PPP") : "Start Date"}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0">
          <Calendar
            mode="single"
            selected={startDate}
            onSelect={(date) => {
              onStartDateChange(date);
              if (date && endDate && date > endDate) {
                onEndDateChange(undefined);
              }
              setIsStartOpen(false);
            }}
            disabled={(date) => date < new Date()}
          />
        </PopoverContent>
      </Popover>

      <span className="text-gray-500">to</span>

      <Popover open={isEndOpen} onOpenChange={setIsEndOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            className="w-[200px] justify-start text-left font-normal text-muted-foreground"
            disabled={!startDate}
          >
            <CalendarIcon className="mr-2 h-4 w-4" />
            {endDate ? format(endDate, "PPP") : "End Date"}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0">
          <Calendar
            mode="single"
            selected={endDate}
            onSelect={(date) => {
              onEndDateChange(date);
              setIsEndOpen(false);
            }}
            disabled={(date) => {
              if (!startDate) return true;
              return date < startDate || date < new Date();
            }}
          />
        </PopoverContent>
      </Popover>
    </div>
  );
}
