"use client";

import { useState } from "react";
import { Button } from "@forge/ui/button";
import { Card, CardHeader, CardTitle, CardContent, CardAction, CardDescription } from "@forge/ui/card";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectGroup, SelectItem } from "@forge/ui/select";
import { DatePicker } from "@forge/ui/date-picker";
import { TimePicker } from "@forge/ui/time-picker";
import { DateRangePicker } from "@forge/ui/date-range-picker";
import { X, Check } from 'lucide-react';
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
    recipients?: string[]; // For batch mode
    isBatchMode?: boolean;
}

export const EmailSectionTwo = ({ onClose, isClosing, emailData }: EmailSectionTwoProps) => {
    const [isSent, setIsSent] = useState(false);
    const [priority, setPriority] = useState<string>("standard");
    const [scheduleDate, setScheduleDate] = useState<Date | undefined>();
    const [scheduleTime, setScheduleTime] = useState<Date | undefined>();
    const [blacklistStartDate, setBlacklistStartDate] = useState<Date | undefined>();
    const [blacklistEndDate, setBlacklistEndDate] = useState<Date | undefined>();

    const scheduleEmailMutation = (api as any).emailQueue.scheduleEmail.useMutation();
    const scheduleBatchEmailMutation = (api as any).emailQueue.queueBatchEmail.useMutation();

    // Combine date and time into a single datetime
    const getCombinedDateTime = (): Date | undefined => {
        if (!scheduleDate) return undefined;
        if (!scheduleTime) return scheduleDate; // If no time selected, use date at midnight

        const combined = new Date(scheduleDate);
        combined.setHours(scheduleTime.getHours(), scheduleTime.getMinutes(), 0, 0);
        return combined;
    };

    const handleSend = async () => {
        try {
            setIsSent(true);

            const emailPayload = {
                from: emailData.from || "onboarding@resend.dev",
                subject: emailData.subject,
                html: emailData.body,
                priority: priority as "now" | "high" | "standard" | "low",
                scheduledFor: getCombinedDateTime(),
                blacklistRules: (blacklistStartDate && blacklistEndDate) ? {
                    dateRanges: [{
                        startDate: blacklistStartDate.toISOString(),
                        endDate: blacklistEndDate.toISOString(),
                        reason: "Blacklisted date range"
                    }]
                } : undefined,
                maxAttempts: 3
            };

            if (emailData.isBatchMode && emailData.recipients) {
                // Send batch email
                await scheduleBatchEmailMutation.mutateAsync({
                    recipients: emailData.recipients,
                    ...emailPayload
                });
            } else {
                // Send single email
                await scheduleEmailMutation.mutateAsync({
                    to: emailData.to,
                    ...emailPayload
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
        <div className={`flex items-center justify-center pb-40 transition-all duration-700 ${isClosing ? 'opacity-0 translate-y-4' : 'opacity-100 translate-y-0'
            }`}>
            <Card className={`w-2/3 transition-all duration-800 ${isClosing ? 'opacity-0 scale-95' : 'opacity-100 scale-100'
                }`}>
                <CardHeader>
                    <CardTitle className="text-left">
                        {emailData.isBatchMode ?
                            `Schedule Batch Email (${emailData.recipients?.length || 0} recipients)` :
                            "Schedule Email"
                        }
                    </CardTitle>
                    <CardDescription className="text-left">
                        Optional
                    </CardDescription>
                    <CardAction>
                        <Button onClick={onClose} className="hover:scale-110 transition-transform duration-300 transform">
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
                    <div className="my-4 items-center flex gap-4">
                        <span className="text-sm">Schedule Date & Time (Optional):</span>
                        <div className="flex items-center gap-2">
                            <DatePicker
                                value={scheduleDate}
                                onChange={setScheduleDate}
                            />
                            <TimePicker
                                value={scheduleTime}
                                onChange={setScheduleTime}
                            />
                        </div>
                    </div>
                    <div className="my-4 items-center flex gap-4">
                        <span className="text-sm">Blacklist Date Range:</span>
                        <DateRangePicker
                            startDate={blacklistStartDate}
                            endDate={blacklistEndDate}
                            onStartDateChange={setBlacklistStartDate}
                            onEndDateChange={setBlacklistEndDate}
                        />
                    </div>

                    <Button onClick={handleSend} className={`transition-all duration-300 flex transform hover:scale-105 ${isSent ? (emailData.isBatchMode ? 'w-32' : 'w-24') : (emailData.isBatchMode ? 'w-28' : 'w-20')}`}>
                        <div className="relative overflow-hidden w-full h-full flex items-center justify-center">
                            <div className={`transition-transform duration-300 ${isSent ? '-translate-y-full' : 'translate-y-0'}`}>
                                <span>{emailData.isBatchMode ? 'Send Batch' : 'Send'}</span>
                            </div>
                            <div className={`absolute inset-0 flex items-center justify-center transition-transform duration-300 ${isSent ? 'translate-y-0' : 'translate-y-full'}`}>
                                <div className="flex items-center gap-2">
                                    <Check className="w-4 h-4" />
                                    {emailData.isBatchMode ? 'Batch Sent!' : 'Sent!'}
                                </div>
                            </div>
                        </div>
                    </Button>
                </CardContent>
            </Card>
        </div>
    )
};