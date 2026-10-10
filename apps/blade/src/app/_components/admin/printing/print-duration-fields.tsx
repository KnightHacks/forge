import { PRINTING } from "@forge/consts";
import { Input } from "@forge/ui/input";
import { Label } from "@forge/ui/label";

export function PrintDurationFields({
  hours,
  minutes,
  onHoursChange,
  onMinutesChange,
  disabled,
  alreadyPrinting,
  sessionLimitMinutes,
}: {
  hours: string;
  minutes: string;
  onHoursChange: (value: string) => void;
  onMinutesChange: (value: string) => void;
  disabled: boolean;
  alreadyPrinting: boolean;
  sessionLimitMinutes?: number;
}) {
  const totalMinutes = Number(hours) * 60 + Number(minutes);
  return (
    <fieldset
      disabled={disabled}
      className="grid min-w-0 gap-3 rounded-md border border-border bg-background/60 p-3"
    >
      <legend className="px-1 text-sm font-medium">
        Estimated print duration
      </legend>
      <div className="grid grid-cols-2 gap-3">
        <div className="grid gap-2">
          <Label htmlFor="print-duration-hours">Hours</Label>
          <Input
            id="print-duration-hours"
            type="number"
            min={0}
            max={PRINTING.MAX_PRINT_MINUTES / 60}
            step={1}
            placeholder="0"
            value={hours}
            onChange={(event) => onHoursChange(event.target.value)}
            className="min-h-11"
          />
        </div>
        <div className="grid gap-2">
          <Label htmlFor="print-duration-minutes">Minutes</Label>
          <Input
            id="print-duration-minutes"
            type="number"
            min={0}
            max={59}
            step={1}
            placeholder="30"
            value={minutes}
            onChange={(event) => onMinutesChange(event.target.value)}
            className="min-h-11"
          />
        </div>
      </div>
      <p className="text-sm text-muted-foreground">
        {alreadyPrinting
          ? "Total duration from the original start. Changing it updates the finish estimate without restarting the timer."
          : "For example, 1 hour and 30 minutes. The timer starts when you save Printing, and the hacker gets an estimated finish time."}
      </p>
      {sessionLimitMinutes !== undefined &&
      totalMinutes > sessionLimitMinutes ? (
        <p role="note" className="text-sm text-destructive dark:text-red-300">
          This estimate exceeds the {sessionLimitMinutes}-minute session limit.
          Review the model’s size with the hacker before printing.
        </p>
      ) : null}
      {totalMinutes > PRINTING.MAX_PRINT_MINUTES ? (
        <p role="alert" className="text-sm text-destructive">
          Enter a duration of at most {PRINTING.MAX_PRINT_MINUTES / 60} hours.
        </p>
      ) : null}
    </fieldset>
  );
}
