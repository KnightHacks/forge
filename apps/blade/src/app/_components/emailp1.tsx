"use client";

import { useState } from "react";
import { User, Users } from "lucide-react";

import { Button } from "@forge/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@forge/ui/card";
import {
  InputGroup,
  InputGroupAddon,
  InputGroupInput,
  InputGroupText,
  InputGroupTextarea,
} from "@forge/ui/input-group";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@forge/ui/select";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@forge/ui/tooltip";

interface EmailSectionOneProps {
  onSchedule: (emailData: EmailFormData) => void;
  onModeChange?: (isBatchMode: boolean) => void;
}

interface EmailFormData {
  to: string;
  from: string;
  subject: string;
  body: string;
  recipients?: string[];
  isBatchMode?: boolean;
}

export const EmailSectionOne = ({
  onSchedule,
  onModeChange,
}: EmailSectionOneProps) => {
  const [formData, setFormData] = useState<EmailFormData>({
    to: "",
    from: "",
    subject: "",
    body: "",
    recipients: [],
    isBatchMode: false,
  });
  const [recipientsText, setRecipientsText] = useState("");

  const handleInputChange = (field: keyof EmailFormData, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleRecipientsChange = (value: string) => {
    setRecipientsText(value);
    const recipients = value
      .split(/[,\n]/)
      .map((email) => email.trim())
      .filter((email) => email.length > 0);
    setFormData((prev) => ({ ...prev, recipients }));
  };

  const toggleBatchMode = () => {
    const newBatchMode = !formData.isBatchMode;
    setFormData((prev) => ({
      ...prev,
      isBatchMode: newBatchMode,
      to: newBatchMode ? "" : prev.to,
      recipients: newBatchMode ? [] : prev.recipients,
    }));
    if (!newBatchMode) {
      setRecipientsText("");
    }
    onModeChange?.(newBatchMode);
  };

  const handleSchedule = () => {
    if (formData.isBatchMode) {
      if (
        !formData.recipients ||
        formData.recipients.length === 0 ||
        !formData.subject ||
        !formData.body
      ) {
        alert(
          "Please fill in all required fields (Recipients, Subject, and Email Content)",
        );
        return;
      }
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      const invalidEmails = formData.recipients.filter(
        (email) => !emailRegex.test(email),
      );
      if (invalidEmails.length > 0) {
        alert(`Invalid email addresses: ${invalidEmails.join(", ")}`);
        return;
      }
    } else {
      if (!formData.to || !formData.subject || !formData.body) {
        alert(
          "Please fill in all required fields (To, Subject, and Email Content)",
        );
        return;
      }
    }

    const dataToPass = {
      ...formData,
      isBatchMode: formData.isBatchMode || false,
      recipients: formData.recipients || [],
    };

    onSchedule(dataToPass);
  };

  return (
    <TooltipProvider>
      <div className="mb-4 flex items-center justify-center px-4 pt-20">
        <Card className="w-full max-w-4xl md:w-2/3">
          <CardHeader>
            <CardTitle className="flex items-center justify-between text-left">
              <span className="text-lg md:text-xl">Send Email</span>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant={formData.isBatchMode ? "default" : "outline"}
                    size="sm"
                    onClick={toggleBatchMode}
                    className="transform transition-transform duration-300 hover:scale-105"
                  >
                    {formData.isBatchMode ? <Users /> : <User />}
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  {formData.isBatchMode ? "Batch" : "Single"}
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
                <div className="mt-2 text-sm text-muted-foreground">
                  {formData.recipients?.length || 0} recipient(s) added
                </div>
              </div>
            ) : (
              <div className="mb-4 flex flex-col gap-4 md:flex-row">
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
                <Select
                  onValueChange={(value) => handleInputChange("from", value)}
                >
                  <SelectTrigger className="flex-1">
                    <SelectValue placeholder="From:" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectGroup>
                      <SelectItem value="no-reply@knighthacks.org">
                        Main (no-reply@knighthacks.org)
                      </SelectItem>
                      <SelectItem value="onboarding@resend.dev">
                        Dev Testing (onboarding@resend.dev)
                      </SelectItem>
                    </SelectGroup>
                  </SelectContent>
                </Select>
              </div>
            )}

            {formData.isBatchMode && (
              <div className="mb-4 flex flex-col gap-4 md:flex-row">
                <div className="flex-1"></div>
                <Select
                  onValueChange={(value) => handleInputChange("from", value)}
                >
                  <SelectTrigger className="flex-1">
                    <SelectValue placeholder="From:" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectGroup>
                      <SelectItem value="no-reply@knighthacks.org">
                        Main (no-reply@knighthacks.org)
                      </SelectItem>
                      <SelectItem value="onboarding@resend.dev">
                        Dev Testing (onboarding@resend.dev)
                      </SelectItem>
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
            <InputGroup className="mb-4 flex w-full">
              <InputGroupTextarea
                placeholder="Dear Lenny..."
                className="h-32 md:h-48"
                value={formData.body}
                onChange={(e) => handleInputChange("body", e.target.value)}
              />
            </InputGroup>
            <Button
              onClick={handleSchedule}
              className="w-full transform transition-transform duration-300 hover:scale-105 md:w-auto"
            >
              Schedule
            </Button>
          </CardContent>
        </Card>
      </div>
    </TooltipProvider>
  );
};
