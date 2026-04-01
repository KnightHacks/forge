"use client";

import { EVENTS, ISSUE } from "@forge/consts";
import { Checkbox } from "@forge/ui/checkbox";
import { Input } from "@forge/ui/input";
import { Label } from "@forge/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@forge/ui/select";

import {
  getStatusLabel,
  parseEventDateTime,
  parseTimeTo12h,
  to24h,
  toAmPmValue,
} from "./issue-dialog-utils";

export interface Role {
  id: string;
  name: string;
}

export interface Hackathon {
  id: string;
  displayName: string;
}

interface StatusSelectProps {
  value: (typeof ISSUE.ISSUE_STATUS)[number];
  onValueChange: (value: (typeof ISSUE.ISSUE_STATUS)[number]) => void;
  className?: string;
}

export function StatusSelect({
  value,
  onValueChange,
  className,
}: StatusSelectProps) {
  return (
    <Select
      value={value}
      onValueChange={(v) =>
        onValueChange(v as (typeof ISSUE.ISSUE_STATUS)[number])
      }
    >
      <SelectTrigger className={className} aria-label="Issue status">
        <SelectValue placeholder="Select status" />
      </SelectTrigger>
      <SelectContent>
        {ISSUE.ISSUE_STATUS.map((status) => (
          <SelectItem key={status} value={status}>
            {getStatusLabel(status)}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

interface PrioritySelectProps {
  value: (typeof ISSUE.PRIORITY)[number];
  onValueChange: (value: (typeof ISSUE.PRIORITY)[number]) => void;
  className?: string;
}

export function PrioritySelect({
  value,
  onValueChange,
  className,
}: PrioritySelectProps) {
  return (
    <Select
      value={value}
      onValueChange={(v) => onValueChange(v as (typeof ISSUE.PRIORITY)[number])}
    >
      <SelectTrigger className={className} aria-label="Priority">
        <SelectValue placeholder="Select priority" />
      </SelectTrigger>
      <SelectContent>
        {ISSUE.PRIORITY.map((priority) => (
          <SelectItem key={priority} value={priority}>
            {priority}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

interface TeamSelectProps {
  value: string;
  onValueChange: (value: string) => void;
  roles: Role[];
  className?: string;
  isLoading?: boolean;
  error?: unknown;
}

export function TeamSelect({
  value,
  onValueChange,
  roles,
  className,
  isLoading,
  error,
}: TeamSelectProps) {
  return (
    <Select value={value} onValueChange={onValueChange}>
      <SelectTrigger className={className} aria-label="Team">
        <SelectValue placeholder="Select team" />
      </SelectTrigger>
      <SelectContent>
        {isLoading && (
          <SelectItem value="loading" disabled>
            Loading teams...
          </SelectItem>
        )}
        {!!error && (
          <SelectItem value="error" disabled>
            Failed to load teams
          </SelectItem>
        )}
        {roles.map((role) => (
          <SelectItem key={role.id} value={role.id}>
            {role.name}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

interface TimePickerFieldProps {
  label: string;
  value?: string; // 24h "HH:MM"
  onChange: (value: string) => void; // emits 24h "HH:MM"
}

export function TimePickerField({
  label,
  value,
  onChange,
}: TimePickerFieldProps) {
  const parsed = parseTimeTo12h(value);

  const update = (part: "hour" | "minute" | "amPm", v: string) => {
    const next = {
      hour: part === "hour" ? v : parsed.hour,
      minute: part === "minute" ? v : parsed.minute,
      amPm: part === "amPm" ? toAmPmValue(v) : parsed.amPm,
    };
    if (!next.hour) next.hour = ISSUE.EVENT_TIME_HOURS[0] ?? "01";
    if (!next.minute) next.minute = ISSUE.EVENT_TIME_MINUTES[0] ?? "00";
    onChange(`${to24h(next.hour, next.amPm)}:${next.minute}`);
  };

  return (
    <div className="grid grid-cols-4 items-center gap-4">
      <Label className="text-right text-sm">{label}</Label>
      <div className="col-span-3 flex items-center space-x-2">
        <Select value={parsed.hour} onValueChange={(v) => update("hour", v)}>
          <SelectTrigger className="w-[80px]">
            <SelectValue placeholder="HH" />
          </SelectTrigger>
          <SelectContent>
            {ISSUE.EVENT_TIME_HOURS.map((h) => (
              <SelectItem key={h} value={h}>
                {h}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <span>:</span>
        <Select
          value={parsed.minute}
          onValueChange={(v) => update("minute", v)}
        >
          <SelectTrigger className="w-[80px]">
            <SelectValue placeholder="MM" />
          </SelectTrigger>
          <SelectContent>
            {ISSUE.EVENT_TIME_MINUTES.map((m) => (
              <SelectItem key={m} value={m}>
                {m}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={parsed.amPm} onValueChange={(v) => update("amPm", v)}>
          <SelectTrigger className="w-[80px]">
            <SelectValue placeholder="AM/PM" />
          </SelectTrigger>
          <SelectContent>
            {ISSUE.EVENT_TIME_AM_PM_OPTIONS.map((o) => (
              <SelectItem key={o} value={o}>
                {o}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    </div>
  );
}

interface RoleCheckboxGroupProps {
  label: string;
  roles: Role[];
  selectedIds: string[];
  onChange: (ids: string[]) => void;
  description?: string;
  keyPrefix?: string;
}

export function RoleCheckboxGroup({
  label,
  roles,
  selectedIds,
  onChange,
  description,
  keyPrefix = "",
}: RoleCheckboxGroupProps) {
  return (
    <div className="grid grid-cols-4 items-start gap-4">
      <Label className="mt-1 text-right text-sm">{label}</Label>
      <div className="col-span-3 mt-1 grid grid-cols-2 gap-x-2 gap-y-3">
        {roles.map((role) => (
          <div
            key={`${keyPrefix}${role.id}`}
            className="flex flex-row items-start space-x-3 space-y-0"
          >
            <Checkbox
              checked={selectedIds.includes(role.id)}
              onCheckedChange={(checked) =>
                onChange(
                  checked
                    ? Array.from(new Set([...selectedIds, role.id]))
                    : selectedIds.filter((id) => id !== role.id),
                )
              }
            />
            <Label className="cursor-pointer font-normal">{role.name}</Label>
          </div>
        ))}
        {description && (
          <p className="col-span-2 text-sm font-normal text-gray-400">
            {description}
          </p>
        )}
      </div>
    </div>
  );
}

interface EventFormFieldsProps {
  eventData: ISSUE.EventFormValues;
  hackathons: Hackathon[];
  isHackathonsLoading?: boolean;
  hackathonsError?: unknown;
  baseId: string;
  onChange: <K extends keyof ISSUE.EventFormValues>(
    key: K,
    value: ISSUE.EventFormValues[K],
  ) => void;
}

export function EventFormFields({
  eventData,
  hackathons,
  isHackathonsLoading,
  hackathonsError,
  baseId,
  onChange,
}: EventFormFieldsProps) {
  const startDateTime = parseEventDateTime(
    eventData.startDate,
    eventData.startTime,
  );
  const endDateTime = parseEventDateTime(eventData.endDate, eventData.endTime);

  return (
    <>
      {/* Tag */}
      <div className="grid grid-cols-4 items-center gap-4">
        <Label className="text-right text-sm">Tag</Label>
        <Select
          value={eventData.tag}
          onValueChange={(v) => onChange("tag", v)}
        >
          <SelectTrigger className="col-span-3 w-full" aria-label="Tag">
            <SelectValue placeholder="Select a tag" />
          </SelectTrigger>
          <SelectContent>
            {EVENTS.EVENT_TAGS.map((t) => (
              <SelectItem key={t} value={t}>
                {t}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Hackathon */}
      <div className="grid grid-cols-4 items-center gap-4">
        <Label className="text-right text-sm">Hackathon</Label>
        <Select
          value={eventData.hackathonId ?? "none"}
          onValueChange={(v) =>
            onChange("hackathonId", v === "none" ? undefined : v)
          }
        >
          <SelectTrigger className="col-span-3 w-full" aria-label="Hackathon">
            <SelectValue placeholder="Select a hackathon" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="none">None</SelectItem>
            {isHackathonsLoading && (
              <SelectItem value="loading" disabled>
                Loading hackathons...
              </SelectItem>
            )}
            {!!hackathonsError && (
              <SelectItem value="error" disabled>
                Failed to load hackathons
              </SelectItem>
            )}
            {hackathons.map((h) => (
              <SelectItem key={h.id} value={h.id}>
                {h.displayName}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Start Date */}
      <div className="grid grid-cols-4 items-center gap-4">
        <Label htmlFor={`${baseId}-start-date`} className="text-right text-sm">
          Start Date
        </Label>
        <Input
          id={`${baseId}-start-date`}
          type="date"
          className="col-span-3 w-full"
          value={eventData.startDate}
          onChange={(e) => onChange("startDate", e.target.value)}
        />
      </div>

      {/* Start Time */}
      <TimePickerField
        label="Start Time"
        value={eventData.startTime}
        onChange={(v) => onChange("startTime", v)}
      />

      {/* End Date */}
      <div className="grid grid-cols-4 items-center gap-4">
        <Label htmlFor={`${baseId}-end-date`} className="text-right text-sm">
          End Date
        </Label>
        <Input
          id={`${baseId}-end-date`}
          type="date"
          className="col-span-3 w-full"
          value={eventData.endDate}
          onChange={(e) => onChange("endDate", e.target.value)}
        />
      </div>

      {/* End Time */}
      <TimePickerField
        label="End Time"
        value={eventData.endTime}
        onChange={(v) => onChange("endTime", v)}
      />

      {/* Room */}
      <div className="grid grid-cols-4 items-center gap-4">
        <Label htmlFor={`${baseId}-location`} className="text-right text-sm">
          Room
        </Label>
        <Input
          id={`${baseId}-location`}
          className="col-span-3 w-full"
          placeholder="Enter room"
          value={eventData.location}
          onChange={(e) => onChange("location", e.target.value)}
        />
      </div>

      {/* Internal Event */}
      <div className="grid grid-cols-4 items-center gap-4">
        <Label className="text-right text-sm">Internal Event?</Label>
        <div className="col-span-3 flex items-center space-x-2">
          <Checkbox
            checked={eventData.isOperationsCalendar ?? false}
            onCheckedChange={(checked) =>
              onChange("isOperationsCalendar", checked === true)
            }
          />
          <span className="text-sm font-normal text-gray-400">
            Use Operations Calendar (Hide from public events)
          </span>
        </div>
      </div>

      {/* Discord Channel ID */}
      {eventData.isOperationsCalendar && (
        <div className="grid grid-cols-4 items-center gap-4">
          <Label className="text-right text-sm">Discord Channel ID</Label>
          <Input
            className="col-span-3 w-full"
            placeholder="Paste Discord voice channel ID"
            value={eventData.discordChannelId}
            onChange={(e) => onChange("discordChannelId", e.target.value)}
          />
        </div>
      )}

      {/* Dues Paying */}
      <div className="grid grid-cols-4 items-center gap-4">
        <Label className="text-right text-sm">Dues Paying?</Label>
        <div className="col-span-3 flex items-center">
          <Checkbox
            checked={eventData.dues_paying ?? false}
            onCheckedChange={(checked) =>
              onChange("dues_paying", checked === true)
            }
          />
        </div>
      </div>

      {/* Timing validation */}
      {startDateTime && endDateTime && endDateTime <= startDateTime && (
        <p className="text-xs text-destructive">
          End time must be after start time.
        </p>
      )}
    </>
  );
}
