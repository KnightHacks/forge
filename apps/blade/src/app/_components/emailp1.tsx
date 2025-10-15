"use client";

import { useState } from "react";
import { Button } from "@forge/ui/button";
import { Card, CardHeader, CardTitle, CardContent } from "@forge/ui/card";
import { InputGroup, InputGroupAddon, InputGroupText, InputGroupInput, InputGroupTextarea } from "@forge/ui/input-group";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectGroup, SelectItem } from "@forge/ui/select";
import { User, Users } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipTrigger, TooltipProvider } from "@forge/ui/tooltip";

interface EmailSectionOneProps {
    onSchedule: (emailData: EmailFormData) => void;
    onModeChange?: (isBatchMode: boolean) => void;
}

interface EmailFormData {
    to: string;
    from: string;
    subject: string;
    body: string;
    recipients?: string[]; // For batch mode
    isBatchMode?: boolean;
}

export const EmailSectionOne = ({ onSchedule, onModeChange }: EmailSectionOneProps) => {
    const [formData, setFormData] = useState<EmailFormData>({
        to: "",
        from: "",
        subject: "",
        body: "",
        recipients: [],
        isBatchMode: false
    });
    const [recipientsText, setRecipientsText] = useState("");

    const handleInputChange = (field: keyof EmailFormData, value: string) => {
        setFormData(prev => ({ ...prev, [field]: value }));
    };

    const handleRecipientsChange = (value: string) => {
        setRecipientsText(value);
        // Parse recipients from textarea (one per line or comma-separated)
        const recipients = value
            .split(/[,\n]/)
            .map(email => email.trim())
            .filter(email => email.length > 0);
        setFormData(prev => ({ ...prev, recipients }));
    };

    const toggleBatchMode = () => {
        const newBatchMode = !formData.isBatchMode;
        setFormData(prev => ({
            ...prev,
            isBatchMode: newBatchMode,
            to: newBatchMode ? "" : prev.to,
            recipients: newBatchMode ? [] : prev.recipients
        }));
        if (!newBatchMode) {
            setRecipientsText("");
        }
        // Notify parent component of mode change
        onModeChange?.(newBatchMode);
    };

    const handleSchedule = () => {
        // Basic validation
        if (formData.isBatchMode) {
            if (!formData.recipients || formData.recipients.length === 0 || !formData.subject || !formData.body) {
                alert("Please fill in all required fields (Recipients, Subject, and Email Content)");
                return;
            }
            // Validate email addresses
            const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
            const invalidEmails = formData.recipients.filter(email => !emailRegex.test(email));
            if (invalidEmails.length > 0) {
                alert(`Invalid email addresses: ${invalidEmails.join(", ")}`);
                return;
            }
        } else {
            if (!formData.to || !formData.subject || !formData.body) {
                alert("Please fill in all required fields (To, Subject, and Email Content)");
                return;
            }
        }

        // Ensure we pass the complete form data including batch mode
        const dataToPass = {
            ...formData,
            isBatchMode: formData.isBatchMode || false,
            recipients: formData.recipients || []
        };

        onSchedule(dataToPass);
    };

    return (
        <TooltipProvider>
            <div className="flex items-center justify-center mb-4 pt-20">
                <Card className="w-2/3">
                    <CardHeader>
                        <CardTitle className="text-left flex items-center justify-between">
                            <span>Send Email</span>
                             <Tooltip>
                                 <TooltipTrigger asChild>
                                     <Button
                                         variant={formData.isBatchMode ? "default" : "outline"}
                                         size="sm"
                                         onClick={toggleBatchMode}
                                         className="hover:scale-105 transition-transform duration-300 transform"
                                     >
                                         {formData.isBatchMode ?
                                             <Users /> : <User />
                                         }
                                     </Button>
                                 </TooltipTrigger>
                                 <TooltipContent>
                                     {formData.isBatchMode ?
                                         "Batch" : "Single"
                                     }
                                 </TooltipContent>
                             </Tooltip>
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        {formData.isBatchMode ? (
                            <div className="mb-4">
                                <InputGroup className="flex w-full">
                                    <InputGroupTextarea
                                        placeholder="Enter email addresses (one per line or comma-separated):&#10;user1@example.com&#10;user2@example.com&#10;user3@example.com"
                                        className="h-32"
                                        value={recipientsText}
                                        onChange={(e) => handleRecipientsChange(e.target.value)}
                                    />
                                </InputGroup>
                                <div className="text-sm text-muted-foreground mt-2">
                                    {formData.recipients?.length || 0} recipient(s) added
                                </div>
                            </div>
                        ) : (
                            <div className="flex gap-4 mb-4">
                                <InputGroup className="flex-1">
                                    <InputGroupAddon>
                                        <InputGroupText>To:</InputGroupText>
                                    </InputGroupAddon>
                                    <InputGroupInput
                                        type="email"
                                        placeholder="tk@knighthacks.org"
                                        value={formData.to}
                                        onChange={(e) => handleInputChange("to", e.target.value)}
                                    />
                                </InputGroup>
                                <Select onValueChange={(value) => handleInputChange("from", value)}>
                                    <SelectTrigger className="flex-1">
                                        <SelectValue placeholder="From:" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectGroup>
                                            <SelectItem value="tk@knighthacks.org">TK (tk@knighthacks.org)</SelectItem>
                                            <SelectItem value="admin@knighthacks.org">Admin (admin@knighthacks.org)</SelectItem>
                                            <SelectItem value="events@knighthacks.org">Events (events@knighthacks.org)</SelectItem>
                                            <SelectItem value="support@knighthacks.org">Support (support@knighthacks.org)</SelectItem>
                                            <SelectItem value="onboarding@resend.dev">Dev Testing (onboarding@resend.dev)</SelectItem>
                                        </SelectGroup>
                                    </SelectContent>
                                </Select>
                            </div>
                        )}

                        {formData.isBatchMode && (
                            <div className="flex gap-4 mb-4">
                                <div className="flex-1"></div>
                                <Select onValueChange={(value) => handleInputChange("from", value)}>
                                    <SelectTrigger className="flex-1">
                                        <SelectValue placeholder="From:" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectGroup>
                                            <SelectItem value="tk@knighthacks.org">TK (tk@knighthacks.org)</SelectItem>
                                            <SelectItem value="admin@knighthacks.org">Admin (admin@knighthacks.org)</SelectItem>
                                            <SelectItem value="events@knighthacks.org">Events (events@knighthacks.org)</SelectItem>
                                            <SelectItem value="support@knighthacks.org">Support (support@knighthacks.org)</SelectItem>
                                            <SelectItem value="onboarding@resend.dev">Dev Testing (onboarding@resend.dev)</SelectItem>
                                        </SelectGroup>
                                    </SelectContent>
                                </Select>
                            </div>
                        )}
                        <InputGroup className="my-4">
                            <InputGroupAddon>
                                <InputGroupText>Subject:</InputGroupText>
                            </InputGroupAddon>
                            <InputGroupInput
                                type="text"
                                placeholder="To my dearest friend..."
                                value={formData.subject}
                                onChange={(e) => handleInputChange("subject", e.target.value)}
                            />
                        </InputGroup>
                        <InputGroup className="flex w-full mb-4">
                            <InputGroupTextarea
                                placeholder="Dear Lenny..."
                                className="h-48"
                                value={formData.body}
                                onChange={(e) => handleInputChange("body", e.target.value)}
                            />
                        </InputGroup>
                        <Button onClick={handleSchedule} className="hover:scale-105 transition-transform duration-300 transform">Schedule</Button>
                    </CardContent>
                </Card>
            </div>
        </TooltipProvider>
    )
};