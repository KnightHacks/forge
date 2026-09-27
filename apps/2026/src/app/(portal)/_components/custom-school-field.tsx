"use client";

import { useState } from "react";

import { cn } from "@forge/ui";
import { FormControl } from "@forge/ui/form";
import { Input } from "@forge/ui/input";
import { ResponsiveComboBox } from "@forge/ui/responsive-combo-box";

import {
  getSchoolChoiceSearchValue,
  isCustomSchoolValue,
  SCHOOL_CHOICES,
} from "~/lib/schools";

export function CustomSchoolField({
  customInputClassName,
  name,
  onBlur,
  onChange,
  switchButtonClassName,
  triggerClassName,
  value,
}: {
  customInputClassName?: string;
  name: string;
  onBlur: () => void;
  onChange: (value: string) => void;
  switchButtonClassName?: string;
  triggerClassName?: string;
  value?: string;
}) {
  const [searchValue, setSearchValue] = useState("");
  const [manualEntryRequested, setManualEntryRequested] = useState(() =>
    isCustomSchoolValue(value),
  );
  const isManualEntry = manualEntryRequested || isCustomSchoolValue(value);

  if (isManualEntry) {
    return (
      <>
        <FormControl>
          <Input
            autoFocus={manualEntryRequested && !value}
            className={customInputClassName}
            name={name}
            onBlur={onBlur}
            onChange={(event) => {
              setManualEntryRequested(true);
              onChange(event.target.value);
            }}
            placeholder="Enter your school"
            value={value ?? ""}
          />
        </FormControl>
        <button
          className={cn(
            "decoration-current/40 mt-3 text-sm font-semibold underline underline-offset-4 transition-opacity hover:opacity-75 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-current",
            switchButtonClassName,
          )}
          onClick={() => {
            setManualEntryRequested(false);
            onChange("");
          }}
          type="button"
        >
          Choose from the school list
        </button>
      </>
    );
  }

  return (
    <FormControl>
      <ResponsiveComboBox
        ariaLabel="School"
        buttonPlaceholder="Select a school"
        getItemLabel={(choice) => choice.label}
        getItemSearchValue={(choice) =>
          getSchoolChoiceSearchValue(choice, searchValue)
        }
        getItemValue={(choice) => choice.value}
        inputPlaceholder="Search for your school"
        items={SCHOOL_CHOICES}
        onItemSelect={(choice) => {
          if (choice.kind === "custom") {
            setManualEntryRequested(true);
            onChange("");
            return;
          }

          setManualEntryRequested(false);
          onChange(choice.value);
        }}
        onSearchValueChange={setSearchValue}
        renderItem={(choice) => <div>{choice.label}</div>}
        triggerClassName={triggerClassName}
        value={value}
      />
    </FormControl>
  );
}
