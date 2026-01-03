"use client";

import type { z } from "zod";
import * as React from "react";
import Image from "next/image";

import type { QuestionValidator } from "@forge/consts/knight-hacks";
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

type FormQuestion = z.infer<typeof QuestionValidator>;

interface QuestionResponseCardProps {
  question: FormQuestion;
  value?: string | string[] | number | Date | null;
  onChange: (value: string | string[] | number | Date | null) => void;
}

export function QuestionResponseCard({
  question,
  value,
  onChange,
}: QuestionResponseCardProps) {
  const isRequired = !question.optional;

  return (
    <Card className="relative flex flex-col gap-4 border-l-4 border-l-transparent bg-card p-6 text-card-foreground transition-all">
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
        <QuestionBody question={question} value={value} onChange={onChange} />
      </div>
    </Card>
  );
}

// Sub-Components

function QuestionBody({
  question,
  value,
  onChange,
}: {
  question: FormQuestion;
  value?: string | string[] | number | Date | null;
  onChange: (value: string | string[] | number | Date | null) => void;
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
        />
      );
    case "CHECKBOXES":
      return (
        <CheckboxesInput
          question={question}
          value={value as string[] | undefined}
          onChange={onChange}
        />
      );
    case "DROPDOWN":
      return (
        <DropdownInput
          question={question}
          value={value as string | undefined}
          onChange={onChange}
        />
      );
    case "DATE":
      return (
        <div className="w-full md:w-1/3">
          <DatePicker
            value={
              value instanceof Date
                ? value
                : value
                  ? new Date(value as string)
                  : undefined
            }
            onChange={(date) => onChange(date || null)}
          />
        </div>
      );
    case "TIME":
      return (
        <div className="w-full md:w-1/3">
          <TimePicker
            value={
              value instanceof Date
                ? value
                : value
                  ? new Date(`1970-01-01T${value as string}`)
                  : undefined
            }
            onChange={(date) => onChange(date || null)}
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
}: {
  question: FormQuestion;
  value?: string;
  onChange: (value: string | string[] | number | Date | null) => void;
}) {
  const options = question.options || [];
  const questionKey = question.question.replace(/\s+/g, "-").toLowerCase();

  return (
    <RadioGroup
      value={value || ""}
      onValueChange={(newValue) => onChange(newValue || null)}
      className="flex flex-col gap-3"
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
}: {
  question: FormQuestion;
  value?: string[];
  onChange: (value: string | string[] | number | Date | null) => void;
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
}: {
  question: FormQuestion;
  value?: string;
  onChange: (value: string | string[] | number | Date | null) => void;
}) {
  const options = question.options || [];

  return (
    <Select
      value={value || ""}
      onValueChange={(newValue) => onChange(newValue || null)}
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
