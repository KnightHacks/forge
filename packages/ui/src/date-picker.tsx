"use client"

import * as React from "react"
import { format } from "date-fns"
import { Calendar as CalendarIcon } from "lucide-react"

import { Button } from "@forge/ui/button"
import { Calendar } from "@forge/ui/calendar"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@forge/ui/popover"

interface DatePickerProps {
  value?: Date;
  onChange?: (date: Date | undefined) => void;
}

export function DatePicker({ value, onChange }: DatePickerProps) {
  const [date, setDate] = React.useState<Date | undefined>(value);

  React.useEffect(() => {
    setDate(value);
  }, [value]);

  const handleSelect = (selectedDate: Date | undefined) => {
    setDate(selectedDate);
    onChange?.(selectedDate);
  };

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          data-empty={!date}
          className="data-[empty=true]:text-muted-foreground w-[280px] justify-start text-left font-normal"
        >
          <CalendarIcon />
          <span className="px-4">{date ? format(date, "PPP") : <span>Pick a date</span>}</span>
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0">
        <Calendar mode="single" selected={date} onSelect={handleSelect} />
      </PopoverContent>
    </Popover>
  )
}