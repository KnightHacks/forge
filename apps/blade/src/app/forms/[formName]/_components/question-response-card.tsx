"use client";

import { FileUp, Loader2, X } from "lucide-react";
import Image from "next/image";
import * as React from "react";
import { useRef, useState } from "react";
import type { z } from "zod";

import type { QuestionValidator } from "@forge/consts/knight-hacks";
import { Button } from "@forge/ui/button";
import { Card } from "@forge/ui/card";
import { Checkbox } from "@forge/ui/checkbox";
import { DatePicker } from "@forge/ui/date-picker";
import { Input } from "@forge/ui/input";
import { Label } from "@forge/ui/label";
import { RadioGroup, RadioGroupItem } from "@forge/ui/radio-group";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@forge/ui/select";
import { TimePicker } from "@forge/ui/time-picker";
import { toast } from "@forge/ui/toast";

import { api } from "~/trpc/react";

type FormQuestion = z.infer<typeof QuestionValidator>;

interface QuestionResponseCardProps {
  question: FormQuestion;
  value?: string | string[] | number | Date | null;
  onChange: (value: string | string[] | number | Date | null) => void;
  disabled?: boolean;
  formId?: string;
}

export function QuestionResponseCard({
  question,
  value,
  onChange,
  disabled = false,
  formId,
}: QuestionResponseCardProps) {
  const isRequired = !question.optional;

  return (
    <Card className="relative flex flex-col gap-4 bg-card p-6 text-card-foreground transition-all">
      {/* Header */}
      <div className="flex flex-col gap-4">
        <div className="flex items-start gap-2">
          <h3 className="text-base font-medium">
            {question.question}
            {isRequired && <span className="ml-1 text-red-500">*</span>}
          </h3>
        </div>
        {question.image && (
          <div className="relative h-48 w-full overflow-hidden rounded-md">
            <Image
              src={question.image}
              alt={question.question}
              fill
              className="object-contain"
            />
          </div>
        )}
      </div>

      {/* Body */}
      <div className="pt-2">
        <QuestionBody
          question={question}
          value={value}
          onChange={onChange}
          disabled={disabled}
          formId={formId}
        />
      </div>
    </Card>
  );
}

// Sub-Components

function QuestionBody({
  question,
  value,
  onChange,
  disabled = false,
  formId,
}: {
  question: FormQuestion;
  value?: string | string[] | number | Date | null;
  onChange: (value: string | string[] | number | Date | null) => void;
  disabled?: boolean;
  formId?: string;
}) {
  switch (question.type) {
    case "SHORT_ANSWER":
    case "PARAGRAPH":
      return (
        <div className="w-full md:w-2/3">
          <Input
            placeholder="Your answer"
            value={(value as string) || ""}
            onChange={(e) => onChange(e.target.value)}
            disabled={disabled}
            className="rounded-none border-x-0 border-b border-t-0 border-gray-300 bg-transparent px-0 shadow-none outline-none focus-visible:border-b-2 focus-visible:border-primary focus-visible:ring-0"
          />
        </div>
      );

    case "MULTIPLE_CHOICE":
      return (
        <MultipleChoiceInput
          question={question}
          value={value as string | undefined}
          onChange={onChange}
          disabled={disabled}
        />
      );

    case "CHECKBOXES":
      return (
        <CheckboxesInput
          question={question}
          value={value as string[] | undefined}
          onChange={onChange}
          disabled={disabled}
        />
      );

    case "DROPDOWN":
      return (
        <DropdownInput
          question={question}
          value={value as string | undefined}
          onChange={onChange}
          disabled={disabled}
        />
      );

    case "DATE":
      return (
        <div className={`w-full md:w-1/3`}>
          <DatePicker
            value={
              value instanceof Date
                ? value
                : value
                  ? new Date(value as string)
                  : undefined
            }
            onChange={(date) => onChange(date || null)}
            disabled={disabled}
          />
        </div>
      );

    case "TIME":
      return (
        <div className={`w-full md:w-1/3`}>
          <TimePicker
            value={
              value instanceof Date
                ? value
                : value
                  ? new Date(`1970-01-01T${value as string}`)
                  : undefined
            }
            onChange={(date) => onChange(date || null)}
            disabled={disabled}
          />
        </div>
      );

    case "EMAIL":
      return (
        <div className="w-full md:w-2/3">
          <Input
            type="email"
            placeholder="your.email@example.com"
            value={(value as string) || ""}
            onChange={(e) => onChange(e.target.value)}
            disabled={disabled}
            className="rounded-none border-x-0 border-b border-t-0 border-gray-300 bg-transparent px-0 shadow-none outline-none focus-visible:border-b-2 focus-visible:border-primary focus-visible:ring-0"
          />
        </div>
      );

    case "NUMBER":
      return (
        <div className="w-full md:w-1/3">
          <Input
            type="number"
            placeholder="Enter a number"
            value={
              typeof value === "number"
                ? String(value)
                : value && typeof value === "string"
                  ? value
                  : ""
            }
            onChange={(e) => {
              const numValue =
                e.target.value === "" ? null : Number(e.target.value);
              onChange(numValue);
            }}
            min={question.min}
            max={question.max}
            disabled={disabled}
            className="rounded-none border-x-0 border-b border-t-0 border-gray-300 bg-transparent px-0 shadow-none outline-none focus-visible:border-b-2 focus-visible:border-primary focus-visible:ring-0"
          />
        </div>
      );

    case "PHONE":
      return (
        <div className="w-full md:w-2/3">
          <Input
            type="tel"
            placeholder="(123) 456-7890"
            value={(value as string) || ""}
            onChange={(e) => onChange(e.target.value)}
            disabled={disabled}
            className="rounded-none border-x-0 border-b border-t-0 border-gray-300 bg-transparent px-0 shadow-none outline-none focus-visible:border-b-2 focus-visible:border-primary focus-visible:ring-0"
          />
        </div>
      );

    case "FILE_UPLOAD":
      return (
        <FileUploadInput
          value={value as string | null}
          onChange={onChange}
          disabled={disabled}
          formId={formId}
        />
      );

    default:
      return null;
  }
}

function MultipleChoiceInput({
  question,
  value,
  onChange,
  disabled = false,
}: {
  question: FormQuestion;
  value?: string;
  onChange: (value: string | string[] | number | Date | null) => void;
  disabled: boolean;
}) {
  const options = question.options || [];
  const questionKey = question.question.replace(/\s+/g, "-").toLowerCase();

  return (
    <RadioGroup
      value={value || ""}
      onValueChange={(newValue) => onChange(newValue || null)}
      className="flex flex-col gap-3"
      disabled={disabled}
    >
      {options.map((option, idx) => (
        <div key={idx} className="flex items-center gap-3">
          <RadioGroupItem value={option} id={`${questionKey}-${idx}`} />
          <Label
            htmlFor={`${questionKey}-${idx}`}
            className="cursor-pointer font-normal"
          >
            {option}
          </Label>
        </div>
      ))}
    </RadioGroup>
  );
}

function CheckboxesInput({
  question,
  value,
  onChange,
  disabled,
}: {
  question: FormQuestion;
  value?: string[];
  onChange: (value: string | string[] | number | Date | null) => void;
  disabled?: boolean;
}) {
  const options = question.options || [];
  const selectedValues = value || [];
  const questionKey = question.question.replace(/\s+/g, "-").toLowerCase();

  const handleCheckboxChange = (option: string, checked: boolean) => {
    if (checked) {
      onChange([...selectedValues, option]);
    } else {
      onChange(selectedValues.filter((v) => v !== option));
    }
  };

  return (
    <div className="flex flex-col gap-3">
      {options.map((option, idx) => (
        <div key={idx} className="flex items-center gap-3">
          <Checkbox
            id={`${questionKey}-${idx}`}
            checked={selectedValues.includes(option)}
            onCheckedChange={(checked) =>
              handleCheckboxChange(option, checked === true)
            }
            disabled={disabled}
          />
          <Label
            htmlFor={`${questionKey}-${idx}`}
            className="cursor-pointer font-normal"
          >
            {option}
          </Label>
        </div>
      ))}
    </div>
  );
}

function DropdownInput({
  question,
  value,
  onChange,
  disabled = false,
}: {
  question: FormQuestion;
  value?: string;
  onChange: (value: string | string[] | number | Date | null) => void;
  disabled: boolean;
}) {
  const options = question.options || [];

  return (
    <Select
      value={value || ""}
      onValueChange={(newValue) => onChange(newValue || null)}
      disabled={disabled}
    >
      <SelectTrigger className="w-full md:w-1/2">
        <SelectValue placeholder="Select an option" />
      </SelectTrigger>
      <SelectContent>
        {options.map((option, idx) => (
          <SelectItem key={idx} value={option}>
            {option}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

function FileUploadInput({
  value,
  onChange,
  disabled = false,
  formId,
}: {
  value?: string | null;
  onChange: (value: string | string[] | number | Date | null) => void;
  disabled?: boolean;
  formId?: string;
}) {
  const [isUploading, setIsUploading] = useState(false);
  const [fileName, setFileName] = useState<string | null>(
    value ? value.split("/").pop() || null : null,
  );
  const fileInputRef = useRef<HTMLInputElement>(null);

  const getUploadUrlMutation = api.forms.getUploadUrl.useMutation();

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const allowedTypes = [
      "image/",
      "video/",
      "audio/",
      "application/pdf",
      "text/",
      "application/json",
      "application/csv",
      "text/csv",
      "text/markdown",
      "text/plain",
    ];
    const allowedExtensions = [
      ".pdf",
      ".csv",
      ".json",
      ".md",
      ".markdown",
      ".txt",
    ];
    
    const isValidType =
      allowedTypes.some((type) => file.type.startsWith(type)) ||
      allowedExtensions.some((ext) =>
        file.name.toLowerCase().endsWith(ext),
      );

    if (!isValidType) {
      toast.error(
        "Invalid file type. Please upload an image, video, audio, PDF, CSV, JSON, Markdown, or text file.",
      );
      return;
    }

    if (file.size > 100 * 1024 * 1024) {
      toast.error("File must be less than 100MB");
      return;
    }

    if (!formId) {
      toast.error("Form ID is required for file upload");
      return;
    }

    let mediaType: "image" | "video" | "file" = "file";
    if (file.type.startsWith("image/")) {
      mediaType = "image";
    } else if (file.type.startsWith("video/")) {
      mediaType = "video";
    }

    setIsUploading(true);

    try {
      const result = await getUploadUrlMutation.mutateAsync({
        fileName: file.name,
        formId,
        mediaType,
      });

      const uploadResponse = await fetch(result.uploadUrl, {
        method: "PUT",
        body: file,
        headers: {
          "Content-Type": file.type,
        },
      });

      if (!uploadResponse.ok) {
        throw new Error(`Upload failed: ${uploadResponse.statusText}`);
      }

      onChange(result.objectName);
      setFileName(file.name);
      toast.success("File uploaded successfully!");
    } catch {
      toast.error("Failed to upload file. Please try again.");
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const handleRemoveFile = () => {
    onChange(null);
    setFileName(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  return (
    <div className="w-full space-y-2">
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*,video/*,audio/*,.pdf,.csv,.json,.md,.markdown,.txt"
        onChange={handleFileUpload}
        className="hidden"
        disabled={disabled || isUploading}
      />
      {!fileName && (
        <Button
          type="button"
          variant="outline"
          onClick={() => fileInputRef.current?.click()}
          disabled={disabled || isUploading}
          className="w-full"
        >
          {isUploading ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Uploading...
            </>
          ) : (
            <>
              <FileUp className="mr-2 h-4 w-4" />
              Choose File
            </>
          )}
        </Button>
      )}
      {fileName && (
        <div className="flex items-center justify-between rounded-md border bg-muted/50 p-2">
          <span className="flex-1 truncate text-sm">{fileName}</span>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            onClick={handleRemoveFile}
            disabled={disabled}
            className="h-8 w-8"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      )}
    </div>
  );
}
