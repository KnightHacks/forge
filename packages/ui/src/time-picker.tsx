"use client";

import * as React from "react";
import { Clock } from "lucide-react";

import { cn } from "@forge/ui";
import { InputGroup, InputGroupInput } from "@forge/ui/input-group";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@forge/ui/select";

interface TimePickerProps {
  value?: Date;
  onChange?: (date: Date | undefined) => void;
  placeholder?: string;
  className?: string;
  use12Hour?: boolean;
  label?: string;
  disabled?: boolean;
}

export function TimePicker({
  value,
  onChange,
  placeholder: _placeholder = "Select time",
  className,
  use12Hour = true,
  label,
  disabled = false,
}: TimePickerProps) {
  const [hours, setHours] = React.useState<string>("");
  const [minutes, setMinutes] = React.useState<string>("");
  const [ampm, setAmpm] = React.useState<string>("AM");

  React.useEffect(() => {
    if (value) {
      const h = value.getHours();
      const m = value.getMinutes();

      if (use12Hour) {
        const displayHours = h === 0 ? 12 : h > 12 ? h - 12 : h;
        const displayAmpm = h < 12 ? "AM" : "PM";
        setHours(displayHours.toString().padStart(2, "0"));
        setMinutes(m.toString().padStart(2, "0"));
        setAmpm(displayAmpm);
      } else {
        setHours(h.toString().padStart(2, "0"));
        setMinutes(m.toString().padStart(2, "0"));
        setAmpm("");
      }
    } else {
      setHours("");
      setMinutes("");
      setAmpm(use12Hour ? "AM" : "");
    }
  }, [value, use12Hour]);

  const updateTime = (
    newHours: string,
    newMinutes: string,
    newAmpm: string,
  ) => {
    if (onChange && newHours && newMinutes) {
      let hour24 = parseInt(newHours) || 0;
      const minute = parseInt(newMinutes) || 0;

      if (use12Hour) {
        // default to AM if not set
        const currentAmpm = newAmpm || "AM";
        const isAM = currentAmpm.toUpperCase() === "AM";
        if (isAM && hour24 === 12) hour24 = 0;
        if (!isAM && hour24 !== 12) hour24 = hour24 + 12;
      }

      const date = new Date();
      date.setHours(hour24, minute, 0, 0);
      onChange(date);
    }
  };

  const updateHours = (newHours: string) => {
    if (onChange && newHours) {
      let hour24 = parseInt(newHours) || 0;
      const minute = parseInt(minutes) || 0;

      if (use12Hour) {
        // default to AM if not set
        const currentAmpm = ampm || "AM";
        const isAM = currentAmpm.toUpperCase() === "AM";
        if (isAM && hour24 === 12) hour24 = 0;
        if (!isAM && hour24 !== 12) hour24 = hour24 + 12;
      }

      const date = new Date();
      date.setHours(hour24, minute, 0, 0);
      onChange(date);
    }
  };

  const updateMinutes = (newMinutes: string) => {
    if (onChange && newMinutes) {
      let hour24 = parseInt(hours) || 0;
      const minute = parseInt(newMinutes) || 0;

      if (use12Hour) {
        // default to AM if not set
        const currentAmpm = ampm || "AM";
        const isAM = currentAmpm.toUpperCase() === "AM";
        if (isAM && hour24 === 12) hour24 = 0;
        if (!isAM && hour24 !== 12) hour24 = hour24 + 12;
      }

      const date = new Date();
      date.setHours(hour24, minute, 0, 0);
      onChange(date);
    }
  };

  const handleHoursChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const input = e.target.value.replace(/\D/g, "");
    if (input.length <= 2) {
      setHours(input);
    }
  };

  const handleHoursBlur = () => {
    const hoursNum = parseInt(hours);
    let finalHours = hours;

    if (use12Hour) {
      if (hoursNum > 12) {
        finalHours = "12";
        setHours("12");
      } else if (hoursNum < 1 && hours !== "") {
        finalHours = "1";
        setHours("1");
      }
    } else {
      if (hoursNum > 23) {
        finalHours = "23";
        setHours("23");
      }
    }

    // always trigger update when we have valid hours
    if (finalHours) {
      updateHours(finalHours);
    }
  };

  const handleMinutesChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const input = e.target.value.replace(/\D/g, "");
    if (input.length <= 2) {
      setMinutes(input);
    }
  };

  const handleMinutesBlur = () => {
    const minutesNum = parseInt(minutes);
    let finalMinutes = minutes;

    if (minutesNum > 59) {
      finalMinutes = "59";
      setMinutes("59");
    } else if (minutesNum < 0 && minutes !== "") {
      finalMinutes = "00";
      setMinutes("00");
    }

    // always trigger update when we have valid minutes
    if (finalMinutes) {
      updateMinutes(finalMinutes);
    }
  };

  const handleAmpmChange = (value: string) => {
    setAmpm(value);
    updateTime(hours, minutes, value);
  };

  return (
    <div className="space-y-2">
      {label && (
        <label className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
          {label}
        </label>
      )}
      <div className={cn("flex items-center gap-2", className)}>
        <Clock className="h-4 w-4 text-muted-foreground" />
        <InputGroup className="w-16">
          <InputGroupInput
            type="text"
            value={hours}
            onChange={handleHoursChange}
            onBlur={handleHoursBlur}
            placeholder="HH"
            className="text-center"
            maxLength={2}
            disabled={disabled}
          />
        </InputGroup>

        <span className="text-muted-foreground">:</span>

        <InputGroup className="w-16">
          <InputGroupInput
            type="text"
            value={minutes}
            onChange={handleMinutesChange}
            onBlur={handleMinutesBlur}
            placeholder="MM"
            className="text-center"
            maxLength={2}
            disabled={disabled}
          />
        </InputGroup>

        {use12Hour && (
          <Select value={ampm} onValueChange={handleAmpmChange} disabled={disabled}>
            <SelectTrigger className="w-20">
              <SelectValue placeholder="AM" />
            </SelectTrigger>
            <SelectContent>
              <SelectGroup>
                <SelectItem value="AM">AM</SelectItem>
                <SelectItem value="PM">PM</SelectItem>
              </SelectGroup>
            </SelectContent>
          </Select>
        )}
      </div>
    </div>
  );
}
