"use client";

import type { z } from "zod";
import * as React from "react";
import { useRef, useState } from "react";
import Image from "next/image";
import { FileUp, Loader2, X } from "lucide-react";

import type { QuestionValidator } from "@forge/consts/knight-hacks";
import { getDropdownOptionsFromConst } from "@forge/consts/knight-hacks";
import { Button } from "@forge/ui/button";
import { Card } from "@forge/ui/card";
import { Checkbox } from "@forge/ui/checkbox";
import { DatePicker } from "@forge/ui/date-picker";
import { Input } from "@forge/ui/input";
import { Label } from "@forge/ui/label";
import { RadioGroup, RadioGroupItem } from "@forge/ui/radio-group";
import { ResponsiveComboBox } from "@forge/ui/responsive-combo-box";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@forge/ui/select";
import { Slider } from "@forge/ui/slider";
import { Textarea } from "@forge/ui/textarea";
import { TimePicker } from "@forge/ui/time-picker";
import { toast } from "@forge/ui/toast";

import { api } from "~/trpc/react";

type FormQuestion = z.infer<typeof QuestionValidator>;

interface QuestionResponseCardProps {
  question: FormQuestion;
  value?: string | string[] | number | Date | boolean | null;
  onChange: (value: string | string[] | number | Date | boolean | null) => void;
  onBlur?: () => void;
  disabled?: boolean;
  formId?: string;
  error?: string | null;
}

export function QuestionResponseCard({
  question,
  value,
  onChange,
  onBlur,
  disabled = false,
  formId,
  error,
}: QuestionResponseCardProps) {
  const isRequired = !question.optional;

  return (
    <Card className="relative flex flex-col gap-4 bg-card p-6 text-card-foreground transition-all">
      {/* Header */}
      <div className="flex flex-col gap-4">
        <div className="flex items-start gap-2">
          <h3 className="whitespace-pre-line text-base font-medium">
            {question.question}
            {isRequired && <span className="ml-1 text-red-500">*</span>}
          </h3>
        </div>
        {error && <p className="text-sm text-destructive">{error}</p>}
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
          onBlur={onBlur}
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
  onBlur,
  disabled = false,
  formId,
}: {
  question: FormQuestion;
  value?: string | string[] | number | Date | boolean | null;
  onChange: (value: string | string[] | number | Date | null) => void;
  onBlur?: () => void;
  disabled?: boolean;
  formId?: string;
}) {
  switch (question.type) {
    case "SHORT_ANSWER": {
      const currentValue = (value as string) || "";
      const maxLength = 150;
      const charCount = currentValue.length;
      const isOverLimit = charCount > maxLength;

      return (
        <div className="w-full">
          <Input
            placeholder="Your answer"
            value={currentValue}
            onChange={(e) => onChange(e.target.value)}
            disabled={disabled}
            className="rounded-none border-x-0 border-b border-t-0 border-gray-300 bg-transparent px-0 shadow-none outline-none focus-visible:border-b-2 focus-visible:border-primary focus-visible:ring-0"
          />
          <div className="mt-1 flex justify-end">
            <span
              className={`text-xs ${
                isOverLimit ? "text-destructive" : "text-muted-foreground"
              }`}
            >
              {charCount}/{maxLength}
            </span>
          </div>
        </div>
      );
    }
    case "PARAGRAPH": {
      const currentValue = (value as string) || "";
      const maxLength = 750;
      const charCount = currentValue.length;
      const isOverLimit = charCount > maxLength;

      return (
        <div className="w-full">
          <Textarea
            placeholder="Your answer"
            value={currentValue}
            onChange={(e) => onChange(e.target.value)}
            disabled={disabled}
            rows={3}
            className="resize-none overflow-y-auto whitespace-pre-wrap rounded-none border-x-0 border-b border-t-0 border-gray-300 bg-transparent px-0 shadow-none outline-none focus-visible:border-b-2 focus-visible:border-primary focus-visible:ring-0"
          />
          <div className="mt-1 flex justify-end">
            <span
              className={`text-xs ${
                isOverLimit ? "text-destructive" : "text-muted-foreground"
              }`}
            >
              {charCount}/{maxLength}
            </span>
          </div>
        </div>
      );
    }

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
        <div className="w-full">
          <Input
            type="email"
            placeholder="your.email@example.com"
            value={(value as string) || ""}
            onChange={(e) => onChange(e.target.value)}
            onBlur={onBlur}
            disabled={disabled}
            className="rounded-none border-x-0 border-b border-t-0 border-gray-300 bg-transparent px-0 shadow-none outline-none focus-visible:border-b-2 focus-visible:border-primary focus-visible:ring-0"
          />
        </div>
      );

    case "NUMBER":
      return (
        <div className="w-full">
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
        <div className="w-full">
          <Input
            type="tel"
            placeholder="(123) 456-7890"
            value={(value as string) || ""}
            onChange={(e) => onChange(e.target.value)}
            onBlur={onBlur}
            disabled={disabled}
            className="rounded-none border-x-0 border-b border-t-0 border-gray-300 bg-transparent px-0 shadow-none outline-none focus-visible:border-b-2 focus-visible:border-primary focus-visible:ring-0"
          />
        </div>
      );

    case "LINEAR_SCALE":
      return (
        <LinearScaleInput
          question={question}
          value={value as number | undefined}
          onChange={onChange}
          disabled={disabled}
        />
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

    case "BOOLEAN":
      return (
        <BooleanInput
          value={
            typeof value === "string"
              ? value === "true"
              : typeof value === "boolean"
                ? value
                : undefined
          }
          onChange={onChange}
          disabled={disabled}
        />
      );

    case "LINK":
      return (
        <div className="w-full">
          <Input
            type="url"
            placeholder="https://example.com"
            value={(value as string) || ""}
            onChange={(e) => onChange(e.target.value)}
            onBlur={onBlur}
            disabled={disabled}
            className="rounded-none border-x-0 border-b border-t-0 border-gray-300 bg-transparent px-0 shadow-none outline-none focus-visible:border-b-2 focus-visible:border-primary focus-visible:ring-0"
          />
        </div>
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
  // If optionsConst is set, load options from constants instead of question.options
  const options = question.optionsConst
    ? getDropdownOptionsFromConst(question.optionsConst)
    : question.options || [];
  const questionKey = question.question.replace(/\s+/g, "-").toLowerCase();
  const [otherText, setOtherText] = useState<string>("");
  const OTHER_VALUE = "__OTHER__";
  const allowOther = Boolean(question.allowOther);

  const isOtherSelected =
    value &&
    typeof value === "string" &&
    !options.includes(value) &&
    value !== OTHER_VALUE;

  React.useEffect(() => {
    if (isOtherSelected && typeof value === "string") {
      setOtherText(value);
    }
  }, [value, isOtherSelected]);

  const capitalizeWords = (text: string): string => {
    return text
      .split(" ")
      .map((word) => {
        if (word.length === 0) return word;
        return word[0]?.toUpperCase() + word.slice(1).toLowerCase();
      })
      .join(" ");
  };

  const handleOtherTextChange = (text: string) => {
    const capitalized = capitalizeWords(text);
    setOtherText(capitalized);
    onChange(capitalized || null);
  };

  const handleRadioChange = (newValue: string) => {
    if (newValue === OTHER_VALUE) {
      // When "Other" is selected, don't clear the text, just mark as other
      onChange(otherText || OTHER_VALUE);
    } else {
      onChange(newValue || null);
    }
  };

  return (
    <div className="flex flex-col gap-3">
      <RadioGroup
        value={
          isOtherSelected ? OTHER_VALUE : typeof value === "string" ? value : ""
        }
        onValueChange={handleRadioChange}
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
        {allowOther && (
          <div className="flex items-center gap-3">
            <RadioGroupItem value={OTHER_VALUE} id={`${questionKey}-other`} />
            <Label
              htmlFor={`${questionKey}-other`}
              className="cursor-pointer font-normal"
            >
              Other:
            </Label>
          </div>
        )}
      </RadioGroup>
      {allowOther &&
        (isOtherSelected ||
          (typeof value === "string" && value === OTHER_VALUE)) && (
          <div className="ml-7 w-full">
            <Input
              placeholder="Please specify"
              value={otherText}
              onChange={(e) => handleOtherTextChange(e.target.value)}
              onBlur={(e) => {
                const capitalized = capitalizeWords(e.target.value);
                setOtherText(capitalized);
                onChange(capitalized || null);
              }}
              disabled={disabled}
              className="rounded-none border-x-0 border-b border-t-0 border-gray-300 bg-transparent px-0 shadow-none outline-none focus-visible:border-b-2 focus-visible:border-primary focus-visible:ring-0"
            />
          </div>
        )}
    </div>
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
  // If optionsConst is set, load options from constants instead of question.options
  const options = question.optionsConst
    ? getDropdownOptionsFromConst(question.optionsConst)
    : question.options || [];
  const selectedValues = value || [];
  const questionKey = question.question.replace(/\s+/g, "-").toLowerCase();
  const [otherText, setOtherText] = useState<string>("");
  const OTHER_VALUE = "__OTHER__";
  const allowOther = Boolean(question.allowOther);

  // Get all "Other" values (values not in predefined options)
  const otherValues = selectedValues.filter(
    (v) => !options.includes(v) && v !== OTHER_VALUE,
  );

  // If there's an other value, use it as the otherText
  React.useEffect(() => {
    if (otherValues.length > 0) {
      setOtherText(otherValues[0] ?? "");
    }
  }, [otherValues]);

  // Helper function to capitalize first letter of each word
  const capitalizeWords = (text: string): string => {
    return text
      .split(" ")
      .map((word) => {
        if (word.length === 0) return word;
        return word[0]?.toUpperCase() + word.slice(1).toLowerCase();
      })
      .join(" ");
  };

  const handleCheckboxChange = (option: string, checked: boolean) => {
    if (checked) {
      onChange([...selectedValues, option]);
    } else {
      onChange(selectedValues.filter((v) => v !== option));
    }
  };

  const isOtherChecked =
    selectedValues.includes(OTHER_VALUE) || otherValues.length > 0;

  const handleOtherCheckboxChange = (checked: boolean) => {
    if (checked) {
      // Add OTHER_VALUE marker and current otherText if it exists
      const newValues = [...selectedValues.filter((v) => v !== OTHER_VALUE)];
      if (otherText) {
        newValues.push(otherText);
      } else {
        newValues.push(OTHER_VALUE);
      }
      onChange(newValues);
    } else {
      // Remove OTHER_VALUE and all other values
      onChange(
        selectedValues.filter(
          (v) => v !== OTHER_VALUE && !otherValues.includes(v),
        ),
      );
      setOtherText("");
    }
  };

  const handleOtherTextChange = (text: string) => {
    const capitalized = capitalizeWords(text);
    setOtherText(capitalized);

    // Update the selected values: remove old other values and add new one
    const valuesWithoutOther = selectedValues.filter(
      (v) => !otherValues.includes(v) && v !== OTHER_VALUE,
    );
    if (capitalized) {
      onChange([...valuesWithoutOther, capitalized]);
    } else {
      onChange(
        isOtherChecked
          ? [...valuesWithoutOther, OTHER_VALUE]
          : valuesWithoutOther,
      );
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
      {allowOther && (
        <div className="flex items-center gap-3">
          <Checkbox
            id={`${questionKey}-other`}
            checked={isOtherChecked}
            onCheckedChange={(checked) =>
              handleOtherCheckboxChange(checked === true)
            }
            disabled={disabled}
          />
          <Label
            htmlFor={`${questionKey}-other`}
            className="cursor-pointer font-normal"
          >
            Other:
          </Label>
        </div>
      )}
      {allowOther && isOtherChecked && (
        <div className="ml-7 w-full">
          <Input
            placeholder="Please specify"
            value={otherText}
            onChange={(e) => handleOtherTextChange(e.target.value)}
            onBlur={(e) => {
              const capitalized = capitalizeWords(e.target.value);
              setOtherText(capitalized);
              handleOtherTextChange(capitalized);
            }}
            disabled={disabled}
            className="rounded-none border-x-0 border-b border-t-0 border-gray-300 bg-transparent px-0 shadow-none outline-none focus-visible:border-b-2 focus-visible:border-primary focus-visible:ring-0"
          />
        </div>
      )}
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
  // If optionsConst is set, load options from constants instead of question.options
  const options = question.optionsConst
    ? getDropdownOptionsFromConst(question.optionsConst)
    : question.options || [];

  // Use ResponsiveComboBox for dropdowns with more than 15 options
  if (options.length > 15) {
    return (
      <div className="w-full md:w-1/2">
        <ResponsiveComboBox
          items={options}
          renderItem={(option) => <div>{option}</div>}
          getItemValue={(option) => option}
          getItemLabel={(option) => option}
          onItemSelect={(option) => onChange(option || null)}
          buttonPlaceholder="Select an option"
          inputPlaceholder="Search options..."
          isDisabled={disabled}
        />
      </div>
    );
  }

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

function LinearScaleInput({
  question,
  value,
  onChange,
  disabled = false,
}: {
  question: FormQuestion;
  value?: number;
  onChange: (value: string | string[] | number | Date | null) => void;
  disabled?: boolean;
}) {
  const min = question.min ?? 0;
  const max = question.max ?? 5;

  const defaultValue = Math.floor((min + max) / 2);

  const currentValue =
    typeof value === "number"
      ? Math.max(min, Math.min(max, value))
      : defaultValue;

  const handleValueChange = (values: number[]) => {
    const newValue = values[0] ?? defaultValue;
    onChange(newValue);
  };

  const scaleValues = Array.from({ length: max - min + 1 }, (_, i) => min + i);

  return (
    <div className="w-full space-y-2">
      <div className="flex-1">
        <Slider
          value={[currentValue]}
          onValueChange={handleValueChange}
          min={min}
          max={max}
          step={1}
          disabled={disabled}
          className="w-full"
        />
      </div>
      <div className="flex items-center justify-between gap-2">
        {scaleValues.map((value) => (
          <span key={value} className="text-xs text-muted-foreground">
            {value}
          </span>
        ))}
      </div>
    </div>
  );
}

function BooleanInput({
  value,
  onChange,
  disabled = false,
}: {
  value?: boolean;
  onChange: (value: string | string[] | number | Date | null) => void;
  disabled?: boolean;
}) {
  return (
    <div className="flex items-center gap-3">
      <Checkbox
        checked={value ?? false}
        onCheckedChange={(checked) => {
          // Convert boolean to string for storage consistency
          onChange(checked === true ? "true" : "false");
        }}
        disabled={disabled}
      />
    </div>
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

  // used to sync with responseData for view/edit, otherwise value will be null
  React.useEffect(() => {
    setFileName(value ? (value.split("/").pop() ?? null) : null);
  }, [value]);

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
      allowedExtensions.some((ext) => file.name.toLowerCase().endsWith(ext));

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
