"use client";

import { useState } from "react";
import { Check, X } from "lucide-react";

import { Button } from "@forge/ui/button";
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@forge/ui/card";
import { DatePicker } from "@forge/ui/date-picker";
import { DateRangePicker } from "@forge/ui/date-range-picker";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@forge/ui/select";
import { TimePicker } from "@forge/ui/time-picker";

import { api } from "~/trpc/react";

interface EmailSectionTwoProps {
  onClose: () => void;
  isClosing: boolean;
  emailData: EmailFormData;
}

interface EmailFormData {
  to: string;
  from: string;
  subject: string;
  body: string;
  recipients?: string[];
  isBatchMode?: boolean;
}

export const EmailSectionTwo = ({
  onClose,
  isClosing,
  emailData,
}: EmailSectionTwoProps) => {
  const [isSent, setIsSent] = useState(false);
  const [priority, setPriority] = useState<string>("standard");
  const [scheduleDate, setScheduleDate] = useState<Date | undefined>();
  const [scheduleTime, setScheduleTime] = useState<Date | undefined>();
  const [blacklistStartDate, setBlacklistStartDate] = useState<
    Date | undefined
  >();
  const [blacklistEndDate, setBlacklistEndDate] = useState<Date | undefined>();

  const scheduleEmailMutation = api.emailQueue.scheduleEmail.useMutation();
  const scheduleBatchEmailMutation =
    api.emailQueue.queueBatchEmail.useMutation();

  const getCombinedDateTime = (): Date | undefined => {
    if (!scheduleDate) return undefined;
    if (!scheduleTime) return scheduleDate;

    const combined = new Date(scheduleDate);
    combined.setHours(scheduleTime.getHours(), scheduleTime.getMinutes(), 0, 0);
    return combined;
  };

  const handleSend = async () => {
    try {
      setIsSent(true);

      const emailPayload = {
        from: emailData.from || "no-reply@knighthacks.org",
        subject: emailData.subject,
        html: emailData.body,
        priority: priority as "now" | "high" | "standard" | "low",
        scheduledFor: getCombinedDateTime(),
        blacklistRules:
          blacklistStartDate && blacklistEndDate
            ? {
                dateRanges: [
                  {
                    startDate: blacklistStartDate.toISOString(),
                    endDate: blacklistEndDate.toISOString(),
                    reason: "Blacklisted date range",
                  },
                ],
              }
            : undefined,
        maxAttempts: 3,
      };

      if (emailData.isBatchMode && emailData.recipients) {
        await scheduleBatchEmailMutation.mutateAsync({
          recipients: emailData.recipients,
          ...emailPayload,
        });
      } else {
        await scheduleEmailMutation.mutateAsync({
          to: emailData.to,
          ...emailPayload,
        });
      }

      setTimeout(() => {
        setIsSent(false);
      }, 2000);
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error("Failed to schedule email:", error);
      setIsSent(false);
      alert("Failed to schedule email. Please try again.");
    }
  };

  return (
    <div
      className={`flex items-center justify-center px-4 pb-40 transition-all duration-700 ${
        isClosing ? "translate-y-4 opacity-0" : "translate-y-0 opacity-100"
      }`}
    >
      <Card
        className={`duration-800 w-full max-w-4xl transition-all md:w-2/3 ${
          isClosing ? "scale-95 opacity-0" : "scale-100 opacity-100"
        }`}
      >
        <CardHeader>
          <CardTitle className="text-left text-lg md:text-xl">
            {emailData.isBatchMode
              ? `Schedule Batch Email (${emailData.recipients?.length || 0} recipients)`
              : "Schedule Email"}
          </CardTitle>
          <CardDescription className="text-left">Optional</CardDescription>
          <CardAction>
            <Button
              onClick={onClose}
              className="transform transition-transform duration-300 hover:scale-110"
            >
              <X />
            </Button>
          </CardAction>
        </CardHeader>
        <CardContent>
          <Select onValueChange={setPriority} value={priority}>
            <SelectTrigger className="flex-1">
              <SelectValue placeholder="Priority" />
            </SelectTrigger>
            <SelectContent>
              <SelectGroup>
                <SelectItem value="now">Now (Immediate)</SelectItem>
                <SelectItem value="high">High Priority</SelectItem>
                <SelectItem value="standard">Standard</SelectItem>
                <SelectItem value="low">Low Priority</SelectItem>
              </SelectGroup>
            </SelectContent>
          </Select>
          <div className="my-4 flex flex-col items-center gap-4 md:flex-row">
            <span className="text-sm">Schedule Date & Time (Optional):</span>
            <div className="flex flex-col items-center gap-2 md:flex-row">
              <DatePicker value={scheduleDate} onChange={setScheduleDate} />
              <TimePicker value={scheduleTime} onChange={setScheduleTime} />
            </div>
          </div>
          <div className="my-4 flex flex-col items-center gap-4 md:flex-row">
            <span className="text-sm">Blacklist Date Range:</span>
            <DateRangePicker
              startDate={blacklistStartDate}
              endDate={blacklistEndDate}
              onStartDateChange={setBlacklistStartDate}
              onEndDateChange={setBlacklistEndDate}
            />
          </div>

          <Button
            onClick={handleSend}
            className={`flex w-full transform transition-all duration-300 hover:scale-105 md:w-auto ${isSent ? (emailData.isBatchMode ? "md:w-32" : "md:w-24") : emailData.isBatchMode ? "md:w-28" : "md:w-20"}`}
          >
            <div className="relative flex h-full w-full items-center justify-center overflow-hidden">
              <div
                className={`transition-transform duration-300 ${isSent ? "-translate-y-full" : "translate-y-0"}`}
              >
                <span>{emailData.isBatchMode ? "Send Batch" : "Send"}</span>
              </div>
              <div
                className={`absolute inset-0 flex items-center justify-center transition-transform duration-300 ${isSent ? "translate-y-0" : "translate-y-full"}`}
              >
                <div className="flex items-center gap-2">
                  <Check className="h-4 w-4" />
                  {emailData.isBatchMode ? "Batch Sent!" : "Sent!"}
                </div>
              </div>
            </div>
          </Button>
        </CardContent>
      </Card>
    </div>
  );
};
